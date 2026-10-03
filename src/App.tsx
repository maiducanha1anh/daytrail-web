import { useEffect, useState } from 'react'

type HealthState = '\u0110ang ki\u1ec3m tra' | '\u0110\u00e3 k\u1ebft n\u1ed1i' | 'Ch\u01b0a k\u1ebft n\u1ed1i'
type Section = 'H\u00f4m nay' | 'L\u1ecbch' | 'H\u00e0nh tr\u00ecnh'

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const sections: Record<Section, { title: string; description: string }> = {
  'H\u00f4m nay': { title: 'Khung n\u1ec1n \u0111\u00e3 s\u1eb5n s\u00e0ng', description: 'Danh s\u00e1ch c\u00f4ng vi\u1ec7c, nh\u1eadt k\u00fd ng\u00e0y v\u00e0 t\u1ed5ng quan ng\u00e0y s\u1ebd \u0111\u01b0\u1ee3c tri\u1ec3n khai \u1edf c\u00e1c ch\u1eb7ng ti\u1ebfp theo.' },
  'L\u1ecbch': { title: 'L\u1ecbch \u0111ang \u0111\u01b0\u1ee3c chu\u1ea9n b\u1ecb', description: 'T\u1ea1o c\u00f4ng vi\u1ec7c theo ng\u00e0y, c\u00e1c ch\u1ebf \u0111\u1ed9 xem l\u1ecbch v\u00e0 l\u1eb7p l\u1ea1i ch\u01b0a tri\u1ec3n khai trong ch\u1eb7ng 0.' },
  'H\u00e0nh tr\u00ecnh': { title: 'H\u00e0nh tr\u00ecnh \u0111ang \u0111\u01b0\u1ee3c chu\u1ea9n b\u1ecb', description: 'Timeline, kho\u1ea3nh kh\u1eafc n\u1ed5i b\u1eadt v\u00e0 c\u00e1c giai \u0111o\u1ea1n c\u00e1 nh\u00e2n s\u1ebd \u0111\u01b0\u1ee3c tri\u1ec3n khai sau H\u00f4m nay v\u00e0 L\u1ecbch.' },
}

export function App() {
  const [health, setHealth] = useState<HealthState>('\u0110ang ki\u1ec3m tra')
  const [section, setSection] = useState<Section>('H\u00f4m nay')
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${apiBase}/api/health`, { signal: controller.signal })
      .then((response) => response.ok ? setHealth('\u0110\u00e3 k\u1ebft n\u1ed1i') : Promise.reject(new Error('Health request failed')))
      .catch((error: unknown) => { if (error instanceof Error && error.name !== 'AbortError') setHealth('Ch\u01b0a k\u1ebft n\u1ed1i') })
    return () => controller.abort()
  }, [])
  const current = sections[section]
  return <main className="app">
    <header><div className="brand"><span className="mark">D</span><span>DayTrail</span></div><span className={`status ${health === '\u0110\u00e3 k\u1ebft n\u1ed1i' ? 'ok' : ''}`}>&#9679; {health}</span></header>
    <section className="hero"><p className="eyebrow">Kh&#244;ng gian c&#225; nh&#226;n</p><h1>M&#7895;i ng&#224;y m&#7897;t b&#432;&#7899;c ti&#7871;n.</h1><p className="muted">N&#417;i c&#244;ng vi&#7879;c, nh&#7853;t k&#253; v&#224; h&#224;nh tr&#236;nh c&#7911;a b&#7841;n &#273;&#432;&#7907;c gi&#7919; c&#249;ng nhau.</p></section>
    <nav className="tabs" aria-label="&#272;i&#7873;u h&#432;&#7899;ng ch&#237;nh">{(Object.keys(sections) as Section[]).map((item) => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)} aria-current={section === item ? 'page' : undefined}>{item}</button>)}</nav>
    <section className="card"><div className="card-icon">&#10022;</div><h2>{current.title}</h2><p>{current.description}</p><span className="badge">Ch&#7863;ng 0 &middot; N&#7873;n d&#7921; &#225;n</span></section>
    <footer>DayTrail &middot; D&#7919; li&#7879;u c&#225; nh&#226;n, ri&#234;ng t&#432; theo t&#7915;ng t&#224;i kho&#7843;n</footer>
  </main>
}
