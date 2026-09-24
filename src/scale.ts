export type SceneKind =
  | 'proton'
  | 'nucleus'
  | 'atom'
  | 'molecule'
  | 'protein'
  | 'chromosome'
  | 'bloodCell'
  | 'cell'
  | 'muscle'
  | 'capillary'
  | 'skin'
  | 'finger'
  | 'hand'
  | 'human'
  | 'city'
  | 'mountain'
  | 'continent'
  | 'earth'
  | 'sun'
  | 'solarSystem'
  | 'nebula'
  | 'stellarCloud'
  | 'galaxy'
  | 'localGroup'
  | 'universe'

export interface ScaleScene {
  readonly kind: SceneKind
  readonly logSize: number
  readonly name: string
  readonly eyebrow: string
  readonly note: string
  readonly unit: string
  readonly color: string
}

const scenes: readonly ScaleScene[] = [
  { kind: 'proton', logSize: -15, name: 'Протон', eyebrow: 'элементарная частица', note: 'Одна из частиц, из которых состоит ядро. Её внутренняя структура описывается квантовой теорией.', unit: 'м', color: '#88b8ff' },
  { kind: 'nucleus', logSize: -14, name: 'Атомное ядро', eyebrow: 'сердце атома', note: 'Плотное ядро окружено облаками электронной вероятности.', unit: 'м', color: '#78c9ff' },
  { kind: 'atom', logSize: -10, name: 'Атом', eyebrow: 'базовая единица вещества', note: 'Размер атома задаётся движением электронов, а не твёрдым шариком.', unit: 'м', color: '#6ee7d2' },
  { kind: 'molecule', logSize: -9.5, name: 'Молекула воды', eyebrow: 'H₂O', note: 'Два атома водорода и один атом кислорода образуют знакомую молекулу.', unit: 'м', color: '#ff8d73' },
  { kind: 'protein', logSize: -8.4, name: 'Белок', eyebrow: '折叠 · свёрнутая структура', note: 'Цепочка аминокислот принимает форму, необходимую для работы клетки.', unit: 'м', color: '#e889ff' },
  { kind: 'chromosome', logSize: -6.4, name: 'Хромосома', eyebrow: 'хранилище наследственной информации', note: 'Плотно упакованная ДНК и белки формируют одну из 46 хромосом человека.', unit: 'м', color: '#9ee4ff' },
  { kind: 'bloodCell', logSize: -5.1, name: 'Эритроцит', eyebrow: 'клетка крови', note: 'Гибкая клетка без ядра переносит кислород через капилляры.', unit: 'м', color: '#ff637f' },
  { kind: 'cell', logSize: -4.25, name: 'Клетка человека', eyebrow: 'живая система', note: 'Мембрана, цитоплазма, ядро и органеллы работают как единый организм.', unit: 'м', color: '#6cf0cb' },
  { kind: 'muscle', logSize: -3.5, name: 'Мышечное волокно', eyebrow: 'сила и движение', note: 'Внутри волокна миофибриллы сокращаются, двигая тело.', unit: 'м', color: '#ff9872' },
  { kind: 'capillary', logSize: -2.6, name: 'Капилляр', eyebrow: 'кровеносный сосуд', note: 'Сквозь стенку этого тончайшего сосуда происходят обмен газов и веществ.', unit: 'м', color: '#ff526f' },
  { kind: 'skin', logSize: -1.6, name: 'Кожа', eyebrow: 'граница тела и мира', note: 'Слои кератина, дермы и подкожной жировой клетчатки защищают организм.', unit: 'м', color: '#f2b08e' },
  { kind: 'finger', logSize: -0.7, name: 'Кончик пальца', eyebrow: 'микрорельеф кожи', note: 'Пористые хребты удерживают влагу и создают уникальный отпечаток.', unit: 'м', color: '#e8a487' },
  { kind: 'hand', logSize: -0.15, name: 'Кисть руки', eyebrow: 'мышечная система', note: 'Пять пальцев соединены сложной сетью костей, сухожилий и нервов.', unit: 'м', color: '#f5b99b' },
  { kind: 'human', logSize: 0.23, name: 'Человек', eyebrow: 'точка отсчёта', note: 'Наш привычный мир: семьдесят килограммов материи и сложнейшая биология.', unit: 'м', color: '#8ff0d0' },
  { kind: 'city', logSize: 4.2, name: 'Город', eyebrow: 'человеческий масштаб', note: 'Улицы и дома — следствие жизни десятков тысяч людей на площади в несколько километров.', unit: 'м', color: '#8ee6ff' },
  { kind: 'mountain', logSize: 6.2, name: 'Горный хребет', eyebrow: 'литосфера', note: 'Корни гор уходят глубже, чем поднимаются их вершины над уровнем океана.', unit: 'м', color: '#9ad6bd' },
  { kind: 'continent', logSize: 7.05, name: 'Континент', eyebrow: 'суша Земли', note: 'Океаны, рельеф, реки и облака формируют поверхность планеты.', unit: 'м', color: '#5bd2b6' },
  { kind: 'earth', logSize: 7.1, name: 'Земля', eyebrow: 'наш дом', note: 'Тонкая атмосфера, жидкий океан и активное ядро делают планету живой.', unit: 'м', color: '#4db9ff' },
  { kind: 'sun', logSize: 9.14, name: 'Солнце', eyebrow: 'звезда', note: 'В ядре Солнца водород превращается в гелий, высвобождая свет и тепло.', unit: 'м', color: '#ffb95f' },
  { kind: 'solarSystem', logSize: 13, name: 'Солнечная система', eyebrow: 'планетная семья', note: 'Планеты, астероиды и кометы движутся в одном гравитационном поле.', unit: 'м', color: '#ffd48c' },
  { kind: 'nebula', logSize: 16.5, name: 'Туманность', eyebrow: 'колыбель звезд', note: 'Холодный газ и пыль сжимаются, пока внутри не зажгутся первые звёзды.', unit: 'м', color: '#ca8cff' },
  { kind: 'stellarCloud', logSize: 19.4, name: 'Звёздное облако', eyebrow: 'межзвёздная среда', note: 'Миллиарды солнц формируют рукав спиральной структуры.', unit: 'м', color: '#8caaff' },
  { kind: 'galaxy', logSize: 21, name: 'Галактика Млечный Путь', eyebrow: 'наш дом в космосе', note: 'Более ста миллиардов звёзд движутся вокруг центра Млечного Пути.', unit: 'м', color: '#6fc7ff' },
  { kind: 'localGroup', logSize: 22.4, name: 'Локальная группа галактик', eyebrow: 'гравитационные соседи', note: 'Млечный Путь, Андромеда и десятки карликовых галактик связаны общей гравитацией.', unit: 'м', color: '#c78cff' },
  { kind: 'universe', logSize: 26.3, name: 'Наблюдаемая Вселенная', eyebrow: 'горизонт причинности', note: 'Дальше этой границы свет физически не успевает дойти до нас.', unit: 'м', color: '#e8f3ff' },
]

export const SCENES = scenes
export const MIN_LOG = scenes[0].logSize
export const MAX_LOG = scenes.at(-1)!.logSize
export const HUMAN_LOG = scenes.find((scene) => scene.kind === 'human')!.logSize

export function clampLog(value: number): number {
  return Math.min(MAX_LOG, Math.max(MIN_LOG, value))
}

export function sceneAt(logSize: number): ScaleScene {
  let closest = scenes[0]
  let distance = Infinity

  for (const scene of scenes) {
    const nextDistance = Math.abs(scene.logSize - logSize)
    if (nextDistance < distance) {
      closest = scene
      distance = nextDistance
    }
  }

  return closest
}

export function sceneProgress(logSize: number): number {
  return (logSize - MIN_LOG) / (MAX_LOG - MIN_LOG)
}

export function formatScale(logSize: number): { mantissa: string; power: string; precise: string } {
  const size = 10 ** logSize
  const exponent = Math.floor(logSize)
  const mantissa = size / 10 ** exponent

  return {
    mantissa: mantissa.toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
    power: exponent.toLocaleString('ru-RU').replace('-', '−'),
    precise: `${mantissa.toLocaleString('ru-RU', { maximumSignificantDigits: 3 })} · 10${exponent < 0 ? '⁻' : '^'}${Math.abs(exponent)} ${logSize < 9 ? 'м' : 'м'}`,
  }
}
