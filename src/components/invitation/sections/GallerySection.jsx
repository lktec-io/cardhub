export function GallerySection({ data, index = 0 }) {
  const images = data?.images?.filter(Boolean) || [];
  if (images.length === 0) return null;

  return (
    <section className="ch-inv-section ch-inv-gallery ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="ch-inv-gallery__grid">
        {images.map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className="ch-inv-gallery__image" />
        ))}
      </div>
    </section>
  );
}
