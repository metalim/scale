import './style.css'
import { ScaleExperience, type ExperienceState } from './experience'
import { formatScale, HUMAN_LOG, MAX_LOG, MIN_LOG, SCENES, sceneProgress } from './scale'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="experience">
    <div class="scene" id="scene"></div>
    <div class="vignette" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>

    <header class="topbar">
      <a class="brand" href="#" aria-label="Вернуться к человеку">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>SCALE<span class="brand-slash">/</span>3</span>
      </a>
      <div class="journey-status" aria-live="polite">
        <span class="status-dot"></span>
        <span id="statusText">Автополёт</span>
      </div>
      <button class="icon-button" id="audioButton" type="button" aria-label="Звуковое сопровождение" title="Звук недоступен">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7L8 10H5Z"/><path class="wave" d="M16 9c1 1 1 5 0 6M19 7c2 2 2 8 0 10"/></svg>
      </button>
    </header>

    <section class="object-card" aria-live="polite">
      <p class="eyebrow" id="eyebrow">точка отсчёта</p>
      <h1 id="objectName">Человек</h1>
      <div class="scale-readout">
        <span id="mantissa">1,7</span>
        <span class="power">10<sup id="power">0,23</sup> <small>м</small></span>
      </div>
      <p class="object-note" id="objectNote">Наш привычный мир: семьдесят килограммов материи и сложнейшая биология.</p>
      <button class="dive-button" id="diveButton" type="button">
        <span>Погрузиться внутрь</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
      </button>
    </section>

    <aside class="scale-rail" aria-label="Шкала размеров">
      <span class="rail-caption rail-caption--top">наблюдаемая Вселенная</span>
      <div class="rail-line">
        <div class="rail-progress" id="railProgress"></div>
        <div class="rail-current" id="railCurrent"><span></span></div>
        <div class="rail-ticks" id="railTicks"></div>
      </div>
      <span class="rail-caption rail-caption--bottom">протон</span>
    </aside>

    <div class="context-strip" id="contextStrip"></div>

    <nav class="controls" aria-label="Управление путешествием">
      <button class="control-button control-button--primary" id="autoButton" type="button" aria-label="Пауза">
        <span class="pause-icon" aria-hidden="true"><i></i><i></i></span>
        <span class="play-icon" aria-hidden="true"></span>
      </button>
      <div class="control-copy">
        <span id="controlTitle">ПАУЗА</span>
        <small>ПРОБЕЛ</small>
      </div>
      <span class="control-divider"></span>
      <button class="control-button" id="resetButton" type="button" aria-label="Вернуться к человеку" title="Вернуться к человеку (R)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11a8 8 0 1 1 2 5.3M4 5v6h6"/></svg>
      </button>
      <div class="gesture-hint">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="18" rx="4"/><path d="M12 7v4"/></svg>
        <span>колесо · перетаскивание</span>
      </div>
    </nav>

    <div class="edge-label edge-label--left">НЕПРЕРЕРЫВНЫЙ МАСШТАБ</div>
    <div class="edge-label edge-label--right">10⁻¹⁵ — 10²⁷ МЕТРОВ</div>
  </main>
`

const sceneElement = document.querySelector<HTMLElement>('#scene')!
const eyebrow = document.querySelector<HTMLElement>('#eyebrow')!
const objectName = document.querySelector<HTMLElement>('#objectName')!
const objectNote = document.querySelector<HTMLElement>('#objectNote')!
const mantissa = document.querySelector<HTMLElement>('#mantissa')!
const power = document.querySelector<HTMLElement>('#power')!
const statusText = document.querySelector<HTMLElement>('#statusText')!
const controlTitle = document.querySelector<HTMLElement>('#controlTitle')!
const autoButton = document.querySelector<HTMLButtonElement>('#autoButton')!
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton')!
const diveButton = document.querySelector<HTMLButtonElement>('#diveButton')!
const railProgress = document.querySelector<HTMLElement>('#railProgress')!
const railCurrent = document.querySelector<HTMLElement>('#railCurrent')!
const contextStrip = document.querySelector<HTMLElement>('#contextStrip')!
const ticksElement = document.querySelector<HTMLElement>('#railTicks')!

const majorKinds = new Set(['proton', 'cell', 'human', 'galaxy', 'universe'])
for (const scene of SCENES) {
  const tick = document.createElement('button')
  tick.type = 'button'
  tick.className = `rail-tick${majorKinds.has(scene.kind) ? ' rail-tick--major' : ''}`
  tick.style.setProperty('--position', `${sceneProgress(scene.logSize) * 100}%`)
  tick.setAttribute('aria-label', `${scene.name}: ${formatScale(scene.logSize).precise}`)
  tick.title = scene.name
  tick.addEventListener('click', () => {
    experience.jumpTo(scene.logSize)
  })
  ticksElement.append(tick)
}

for (let index = 0; index < 5; index += 1) {
  const item = document.createElement('span')
  item.className = 'context-item'
  contextStrip.append(item)
}

let lastName = ''
let lastFrame = 0
let stateLog = HUMAN_LOG
let stateAuto = true

const experience = new ScaleExperience({
  container: sceneElement,
  onState: renderState,
})

function renderState(state: ExperienceState): void {
  stateLog = state.log
  stateAuto = state.auto
  const now = performance.now()
  if (state.scene.name !== lastName) {
    lastName = state.scene.name
    eyebrow.textContent = state.scene.eyebrow
    objectName.textContent = state.scene.name
    objectNote.textContent = state.scene.note
    document.documentElement.style.setProperty('--scene-color', state.scene.color)
    document.body.dataset.scene = state.scene.kind
    objectName.animate(
      [
        { opacity: 0, transform: 'translateY(12px)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
      ],
      { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    )
  }
  if (now - lastFrame < 33) return
  lastFrame = now
  const formatted = formatScale(state.log)
  mantissa.textContent = formatted.mantissa
  power.textContent = formatted.power
  railProgress.style.height = `${sceneProgress(state.log) * 100}%`
  railCurrent.style.bottom = `${sceneProgress(state.log) * 100}%`
  statusText.textContent = state.auto ? 'Автополёт' : 'Свободный полёт'
  controlTitle.textContent = state.auto ? 'ПАУЗА' : 'ПРОДОЛЖИТЬ'
  autoButton.setAttribute('aria-label', state.auto ? 'Пауза' : 'Продолжить автополёт')
  autoButton.classList.toggle('is-paused', !state.auto)
  diveButton.disabled = !state.canDive
  diveButton.classList.toggle('is-disabled', !state.canDive)
  diveButton.querySelector('span')!.textContent = state.canDive ? 'Погрузиться внутрь' : 'Внешний план'
  const contextIndex = Math.min(4, Math.max(0, Math.floor(sceneProgress(state.log) * 5)))
  const contextScenes = SCENES.filter((scene) => majorKinds.has(scene.kind)).slice(0, 5)
  contextScenes.forEach((scene, index) => {
    const element = contextStrip.children[index] as HTMLElement
    element.textContent = scene.name.replace('Галактика ', '')
    element.classList.toggle('is-active', index === contextIndex)
  })
}

autoButton.addEventListener('click', () => experience.toggleAuto())
resetButton.addEventListener('click', () => experience.reset())
diveButton.addEventListener('click', () => {
  const canvas = document.querySelector<HTMLCanvasElement>('.world-canvas')
  canvas?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
})
document.querySelector('.brand')?.addEventListener('click', (event) => {
  event.preventDefault()
  experience.reset()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => experience.destroy())
}
