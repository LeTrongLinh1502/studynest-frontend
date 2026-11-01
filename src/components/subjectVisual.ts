import heroArt from '../interface/tongquan_hocsinh/dashboard-hero-art.png'
import mathArt from '../interface/tongquan_hocsinh/dashboard-math-art.png'
import physicsArt from '../interface/tongquan_hocsinh/dashboard-physics-art.png'
import chemistryArt from '../interface/tongquan_hocsinh/dashboard-chemistry-art.png'
import englishArt from '../interface/tongquan_hocsinh/dashboard-english-art.png'
import literatureArt from '../interface/tongquan_hocsinh/dashboard-literature-art.png'

export const subjectFamilies = [
  { key: 'math', label: 'Toán', image: mathArt, pattern: /\b(toan|math|mathematics)\b/ },
  { key: 'physics', label: 'Vật lý', image: physicsArt, pattern: /\b(vat ly|vat li|ly|li|physics)\b/ },
  { key: 'chemistry', label: 'Hóa học', image: chemistryArt, pattern: /\b(hoa|chem|chemistry)\b/ },
  { key: 'english', label: 'Tiếng Anh', image: englishArt, pattern: /\b(tieng anh|anh van|anh|english)\b/ },
  { key: 'literature', label: 'Ngữ văn', image: literatureArt, pattern: /\b(ngu van|van hoc|van|literature)\b/ },
] as const

export type SubjectFamilyKey = (typeof subjectFamilies)[number]['key']
export type SubjectSelection = SubjectFamilyKey | 'other' | 'all'

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/([a-z])(\d)/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function subjectFamily(name?: string | null): SubjectFamilyKey | 'other' {
  if (!name) return 'other'
  const normalized = normalize(name)
  const match = subjectFamilies.map((family) => ({ family, position: normalized.search(family.pattern) }))
    .filter((item) => item.position >= 0)
    .sort((a, b) => a.position - b.position)[0]
  return match?.family.key ?? 'other'
}

export function subjectArtwork(...labels: (string | null | undefined)[]) {
  for (const label of labels) {
    const family = subjectFamily(label)
    if (family !== 'other') {
      const visual = subjectFamilies.find((item) => item.key === family)!
      return { image: visual.image, theme: visual.key, label: visual.label }
    }
  }
  return { image: heroArt, theme: 'general', label: 'Bài học' }
}
