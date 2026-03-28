import './CarouselSlide.css';

export function CarouselSlide({ images }) {
  // Duplicate items for seamless infinite loop
  const doubled = [...images, ...images];
  // ~5s per image, minimum 12s
  const duration = Math.max(images.length * 5, 12);

  return (
    <div className="carousel-slide">
      <div
        className="carousel-track"
        style={{ '--carousel-duration': `${duration}s` }}
      >
        {doubled.map((img, i) => (
          <div key={`${img.id}-${i}`} className="carousel-item">
            {img.linkUrl ? (
              <a href={img.linkUrl} target="_blank" rel="noopener noreferrer">
                <img src={img.url} alt={img.title || img.fileName || ''} />
              </a>
            ) : (
              <img src={img.url} alt={img.title || img.fileName || ''} />
            )}
            {img.title && <p className="carousel-item-caption">{img.title}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
