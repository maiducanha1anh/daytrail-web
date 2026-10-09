import { PrivateImage } from '../media/PrivateImage'
import type { MediaAsset } from '../media/types'
import { formatLocalDate } from '../tasks/date'
import type { JourneyAlbum, JourneyDayCard } from './types'

export function AlbumCover({ album, onUnauthorized }: { album: JourneyAlbum; onUnauthorized: () => void }) {
  if (album.coverImage) return <PrivateImage className="memory-cover-image" path={album.coverImage.thumbnailUrl} alt={album.coverImage.caption || `Ảnh bìa ${album.title}`} onUnauthorized={onUnauthorized} />
  if (album.excerpt) return <blockquote className="memory-cover-quote">{album.excerpt.text}</blockquote>
  return <div className="memory-cover-empty" aria-hidden="true"><span>✦</span></div>
}

export function MemoryDayCard({ day, onOpen, onOpenImage, onUnauthorized }: {
  day: JourneyDayCard
  onOpen: () => void
  onOpenImage: (image: MediaAsset) => void
  onUnauthorized: () => void
}) {
  return <article className={`memory-day-card${day.highlight ? ' is-highlight' : ''}`}>
    <button className="memory-day-main" type="button" onClick={onOpen}>
      <span className="memory-day-date">{formatLocalDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      {day.highlight && <span className="memory-featured-label">★ Nổi bật</span>}
      {day.excerpt ? <p>{day.excerpt}</p> : <p className="muted-copy">Ngày này được lưu bằng hình ảnh.</p>}
    </button>
    {day.images.length > 0 && <div className="memory-thumbnails">{day.images.slice(0, 3).map((image, index) => <button key={image.id} type="button" onClick={() => onOpenImage(image)} aria-label={`Mở ảnh ${index + 1} ngày ${day.date}`}>
      <PrivateImage path={image.thumbnailUrl} alt={image.caption || `Ảnh ngày ${day.date}`} onUnauthorized={onUnauthorized} showRetry={false} />
      {index === 2 && day.imageCount > 3 && <span className="memory-more-images">+{day.imageCount - 3}</span>}
    </button>)}</div>}
  </article>
}
