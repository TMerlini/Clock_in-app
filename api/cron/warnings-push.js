/**
 * Vercel Cron: computes team and user warnings, sends push via Progressier.
 * Runs every 5–15 min. Requires: PROGRESSIER_API_KEY, PROGRESSIER_API_ENDPOINT, FIREBASE_SERVICE_ACCOUNT_KEY.
 */
import admin from 'firebase-admin';
import { startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';

const ANNUAL_OVERTIME_CAP = 150;
const PUSH_DESTINATION_URL = 'https://www.clock-in.pt';

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const serviceAccount = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}

function memberDisplayName(m) {
  const n = (m.username || '').trim();
  if (n) return n.startsWith('@') ? n : `@${n}`;
  const e = (m.email || '').trim();
  if (e) return e;
  return m.id || 'Unknown';
}

async function computeWarningsForMember(db, member) {
  const warnings = [];
  const name = memberDisplayName(member);
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const yearEndTime = new Date(yearEnd);
  yearEndTime.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekEndTime = new Date(weekEnd);
  weekEndTime.setHours(23, 59, 59, 999);

  const [sessionsSnap, settingsSnap, activeClockInSnap] = await Promise.all([
    db.collection('sessions').where('userId', '==', member.id).get(),
    db.doc(`userSettings/${member.id}`).get(),
    db.doc(`activeClockIns/${member.id}`).get()
  ]);

  const sessions = [];
  sessionsSnap.forEach((d) => {
    const data = d.data();
    const clockIn = data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn);
    sessions.push({ ...data, id: d.id, clockIn });
  });

  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const annualIsencaoLimit = settings.annualIsencaoLimit ?? 200;

  const yearSessions = sessions.filter((s) => {
    const t = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
    return t >= yearStart.getTime() && t <= yearEndTime.getTime();
  });
  const usedIsencaoHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);

  if (usedIsencaoHours >= annualIsencaoLimit) {
    const pct = annualIsencaoLimit > 0 ? ((usedIsencaoHours / annualIsencaoLimit) * 100).toFixed(0) : 0;
    warnings.push({ memberId: member.id, memberName: name, type: 'isencao_over', severity: 'high', detail: `${usedIsencaoHours.toFixed(0)}h / ${annualIsencaoLimit}h (${pct}%)` });
  } else if (annualIsencaoLimit > 0 && usedIsencaoHours >= annualIsencaoLimit * 0.9) {
    const pct = ((usedIsencaoHours / annualIsencaoLimit) * 100).toFixed(0);
    warnings.push({ memberId: member.id, memberName: name, type: 'isencao_approaching', severity: 'medium', detail: `${pct}% (${usedIsencaoHours.toFixed(0)}h / ${annualIsencaoLimit}h)` });
  }

  const weekSessions = sessions.filter((s) => {
    const t = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
    return t >= weekStart.getTime() && t <= weekEndTime.getTime();
  });
  const weekHours = weekSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
  if (weekHours > 40) {
    warnings.push({ memberId: member.id, memberName: name, type: 'overtime_weekly', severity: 'high', detail: `${weekHours.toFixed(0)}h this week` });
  } else if (weekHours >= 35) {
    warnings.push({ memberId: member.id, memberName: name, type: 'overtime_weekly_approaching', severity: 'medium', detail: `${weekHours.toFixed(1)}h this week (approaching 40h limit)` });
  }

  const ytdPaidExtra = yearSessions.reduce((sum, s) => sum + (s.paidExtraHours || 0), 0);
  if (ytdPaidExtra > ANNUAL_OVERTIME_CAP) {
    warnings.push({ memberId: member.id, memberName: name, type: 'overtime_annual', severity: 'high', detail: `${ytdPaidExtra.toFixed(0)}h / ${ANNUAL_OVERTIME_CAP}h` });
  } else if (ytdPaidExtra >= ANNUAL_OVERTIME_CAP * 0.9) {
    const pct = ((ytdPaidExtra / ANNUAL_OVERTIME_CAP) * 100).toFixed(0);
    warnings.push({ memberId: member.id, memberName: name, type: 'overtime_annual_approaching', severity: 'medium', detail: `${pct}% (${ytdPaidExtra.toFixed(0)}h / ${ANNUAL_OVERTIME_CAP}h)` });
  }

  if (activeClockInSnap.exists) {
    const activeData = activeClockInSnap.data();
    const clockInTime = activeData.clockInTime ?? (activeData.clockIn?.toDate ? activeData.clockIn.toDate().getTime() : Date.now());
    const elapsedHours = (Date.now() - clockInTime) / (1000 * 60 * 60);
    if (elapsedHours >= 12) {
      warnings.push({ memberId: member.id, memberName: name, type: 'forgotten_clockout', severity: 'high', detail: `${elapsedHours.toFixed(1)}h (possible forgotten clock-out)` });
    }
    const clockInDate = new Date(clockInTime);
    const hour = clockInDate.getHours();
    if (hour < 6 || hour >= 22) {
      const timeStr = clockInDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      warnings.push({ memberId: member.id, memberName: name, type: 'unusual_clockin_time', severity: 'medium', detail: `Clock-in at ${timeStr}` });
    }
  }

  return warnings;
}

function digest(warnings) {
  return warnings.map((w) => `${w.type}:${w.detail}`).sort().join('|');
}

const WARNING_LABELS = {
  isencao_over: 'Over Isenção limit',
  isencao_approaching: 'Approaching Isenção limit',
  overtime_weekly: 'Over 40h this week',
  overtime_weekly_approaching: 'High weekly hours',
  overtime_annual: 'Over annual overtime cap',
  overtime_annual_approaching: 'Approaching annual overtime',
  forgotten_clockout: 'Possible forgotten clock-out',
  unusual_clockin_time: 'Unusual clock-in time'
};

function formatWarningForPush(w) {
  const label = WARNING_LABELS[w.type] || w.type;
  return `${label}: ${w.detail}`;
}

function buildUserWarningsBody(warnings) {
  if (warnings.length === 0) return 'No warnings';
  if (warnings.length === 1) return formatWarningForPush(warnings[0]);
  const parts = warnings.slice(0, 2).map(formatWarningForPush);
  const more = warnings.length - 2;
  const body = more > 0 ? `${parts.join(' • ')} • +${more} more` : parts.join(' • ');
  return body.substring(0, 100);
}

async function sendProgressierPush(recipientId, title, body, url) {
  const endpoint = process.env.PROGRESSIER_API_ENDPOINT;
  const key = process.env.PROGRESSIER_API_KEY;
  if (!endpoint || !key) {
    console.warn('PROGRESSIER_API_ENDPOINT or PROGRESSIER_API_KEY not set');
    return;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      recipients: { id: recipientId },
      title: title.substring(0, 50),
      body: body.substring(0, 100),
      url: url || PUSH_DESTINATION_URL
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Progressier API error ${res.status}: ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    const enterprisesSnap = await db.collection('enterprises').get();
    const stateRef = db.doc('system/warningPushState');
    const stateSnap = await stateRef.get();
    const lastSent = (stateSnap.exists && stateSnap.data()?.digests) || {};

    const toSend = [];
    const newDigests = { ...lastSent };

    for (const entDoc of enterprisesSnap.docs) {
      const enterpriseId = entDoc.id;
      const membersSnap = await db.collection('userSettings').where('enterpriseId', '==', enterpriseId).get();
      const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data(), email: d.data().email || '', username: d.data().username || '' }));

      if (members.length === 0) continue;

      const memberWarnings = await Promise.all(members.map((m) => computeWarningsForMember(db, m)));
      const allWarnings = memberWarnings.flat();

      const admins = members.filter((m) => (m.enterpriseRole || 'member') === 'admin');

      if (allWarnings.length > 0 && admins.length > 0) {
        const teamDigest = digest(allWarnings);
        const title = 'Clock In: Team Warnings';
        const labels = allWarnings.slice(0, 3).map((w) => WARNING_LABELS[w.type] || w.type);
        const body = `${allWarnings.length} warning(s): ${labels.join(', ')}${allWarnings.length > 3 ? '...' : ''}`.substring(0, 100);
        for (const admin of admins) {
          const key = `team:${admin.id}:${enterpriseId}`;
          if (lastSent[key] !== teamDigest) {
            toSend.push({ recipientId: admin.id, title, body, url: `${PUSH_DESTINATION_URL}/enterprise`, key, digestVal: teamDigest });
          }
        }
      }

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const warnings = memberWarnings[i];
        if (warnings.length === 0) continue;
        const d = digest(warnings);
        const key = `user:${member.id}`;
        if (lastSent[key] !== d) {
          const body = buildUserWarningsBody(warnings);
          toSend.push({ recipientId: member.id, title: 'Clock In: Your Warnings', body, url: PUSH_DESTINATION_URL, key, digestVal: d });
        }
      }
    }

    for (const item of toSend) {
      try {
        await sendProgressierPush(item.recipientId, item.title, item.body, item.url);
        newDigests[item.key] = item.digestVal;
      } catch (err) {
        console.error('Progressier send failed:', err);
      }
    }

    await stateRef.set({ digests: newDigests, lastRun: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return res.status(200).json({ ok: true, sent: toSend.length });
  } catch (err) {
    console.error('warnings-push cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
