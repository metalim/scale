import './style.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_SCALE = 1e-15;
const MAX_SCALE = 8.8e26;
const MIN_LOG = Math.log10(MIN_SCALE);
const MAX_LOG = Math.log10(MAX_SCALE);
const HUMAN_LOG = Math.log10(1.7);
const TAU = Math.PI * 2;

type Level = {
  name: string;
  caption: string;
  scale: number;
  color: string;
  art: string;
};

const levels: Level[] = [
  {
    name: 'Субатомный мир',
    caption: 'Граница известной физики',
    scale: 1e-15,
    color: '#6fffee',
    art: `
      <g class="scene-fx fx-slow-spin" style="transform-origin:800px 450px">
        <circle class="field-orbit" cx="800" cy="450" r="280"/>
        <circle class="field-orbit field-orbit-2" cx="800" cy="450" r="214"/>
        <path class="energy-line" d="M540 450C620 300 710 300 800 450S990 590 1060 450"/>
        <path class="energy-line energy-line-2" d="M580 330C670 510 730 510 800 450S930 390 1020 570"/>
        <circle class="soft-glow" cx="800" cy="450" r="250" fill="url(#aquaGlow)"/>
        <g class="proton-core">
          <circle class="core-shell" cx="800" cy="450" r="112"/>
          <circle class="quark quark-a" cx="800" cy="365" r="54"/>
          <circle class="quark quark-b" cx="872" cy="493" r="54"/>
          <circle class="quark quark-c" cx="728" cy="493" r="54"/>
          <circle class="quark-core" cx="800" cy="450" r="18"/>
          <text x="800" y="384" text-anchor="middle">u</text>
          <text x="872" y="584" text-anchor="middle">d</text>
          <text x="728" y="584" text-anchor="middle">u</text>
        </g>
      </g>
      <g class="scale-ticks micro-ticks">
        ${[-260, -180, -100, 100, 180, 260].map((x) => `<path d="M${800 + x} 790v18"/>`).join('')}
        <path d="M540 799h520"/>
      </g>`,
  },
  {
    name: 'Атомное ядро',
    caption: 'Плотнейшее привычное вещество',
    scale: 2e-12,
    color: '#ffcf77',
    art: `
      <g class="fx-drift">
        <ellipse class="electron-shell" cx="800" cy="450" rx="370" ry="118"/>
        <ellipse class="electron-shell shell-tilt" cx="800" cy="450" rx="370" ry="118" transform="rotate(60 800 450)"/>
        <ellipse class="electron-shell shell-tilt wide" cx="800" cy="450" rx="370" ry="118" transform="rotate(-60 800 450)"/>
        <g class="fx-slow-spin" style="transform-origin:800px 450px">
          <circle class="electron" cx="1170" cy="450" r="10"/>
          <circle class="electron electron-2" cx="630" cy="450" r="10"/>
          <circle class="electron electron-3" cx="800" cy="702" r="10"/>
        </g>
        <g class="nucleus-cluster">
          ${[
            [800, 450], [735, 410], [866, 408], [710, 494], [850, 490], [788, 536],
            [879, 548], [671, 550], [737, 605], [855, 612], [786, 668], [970, 470],
            [645, 470], [750, 330], [930, 562], [1040, 550], [554, 552], [965, 620],
          ].map(([x, y], i) => `<circle class="nucleon ${i % 2 ? 'neutron' : 'proton'}" cx="${x}" cy="${y}" r="${i === 0 ? 64 : 53}"/>`).join('')}
        </g>
        <circle class="nucleus-glow" cx="800" cy="500" r="245"/>
      </g>
      <g class="scale-ticks">
        <path d="M610 800h380"/><path d="M610 790v20M800 786v28M990 790v20"/>
        <text x="610" y="845">2 pm</text>
      </g>`,
  },
  {
    name: 'Двойная спираль',
    caption: 'Код жизни около двух нанометров',
    scale: 2e-9,
    color: '#5affda',
    art: `
      <g class="fx-drift dna-wrap" style="transform-origin:800px 450px">
        <path class="dna-glow" d="M590 120C1040 220 560 300 1010 410S560 590 1010 700 590 790 700 850"/>
        <path class="dna-strand" d="M590 120C1040 220 560 300 1010 410S560 590 1010 700 590 790 700 850"/>
        <path class="dna-strand strand-b" d="M1010 120C560 220 1040 300 590 410S1040 590 590 700 1010 790 900 850"/>
        ${Array.from({ length: 14 }, (_, i) => {
          const y = 135 + i * 48;
          const offset = 210 * Math.sin(i * 0.82);
          return `<path class="base-pair" style="--base:${(i % 4) * 25}%;--delay:${i}" d="M${800 + offset} ${y}L${800 - offset} ${y}"/>`;
        }).join('')}
        <circle class="dna-node" cx="800" cy="380" r="14"/>
        <circle class="dna-node node-b" cx="800" cy="620" r="14"/>
      </g>
      <g class="annotation annotation-right">
        <path d="M980 352h160"/><circle cx="980" cy="352" r="5"/>
        <text x="1155" y="345">ПАРЫ ОСНОВАНИЙ</text><text x="1155" y="372">УДЕРЖИВАЮТ СПИРАЛЬ</text>
      </g>`,
  },
  {
    name: 'Вирус',
    caption: 'Сто нанометров сложной геометрии',
    scale: 2e-7,
    color: '#b889ff',
    art: `
      <g class="fx-breathe" style="transform-origin:800px 450px">
        ${Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * TAU;
          const x = 800 + Math.cos(a) * 270;
          const y = 450 + Math.sin(a) * 270;
          return `<g class="spike spike-${i % 3}"><path d="M${800 + Math.cos(a) * 185} ${450 + Math.sin(a) * 185}L${x} ${y}"/><circle cx="${x}" cy="${y}" r="20"/></g>`;
        }).join('')}
        <polygon class="capsid" points="800,180 990,250 1080,450 990,650 800,720 610,650 520,450 610,250"/>
        <polygon class="capsid-inner" points="800,240 930,290 1000,450 930,610 800,660 670,610 600,450 670,290"/>
        <path class="viral-rna" d="M670 450c35-90 72 90 108 0s73 90 109 0 73 90 109 0"/>
        <g class="ribosomes">${Array.from({ length: 7 }, (_, i) => `<circle cx="${690 + i * 37}" cy="${390 + (i % 3) * 60}" r="7"/>`).join('')}</g>
      </g>
      <circle class="virus-halo" cx="800" cy="450" r="330"/>`,
  },
  {
    name: 'Пыльца',
    caption: 'Сложная архитектура размером в пылинку',
    scale: 1e-4,
    color: '#f5c36b',
    art: `
      <g class="fx-drift" style="transform-origin:800px 450px">
        <ellipse class="pollen-halo" cx="800" cy="450" rx="320" ry="265"/>
        <ellipse class="pollen-shell" cx="800" cy="450" rx="250" ry="205"/>
        <ellipse class="pollen-inner" cx="800" cy="450" rx="194" ry="150"/>
        ${Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * TAU;
          const x1 = 800 + Math.cos(a) * 210;
          const y1 = 450 + Math.sin(a) * 168;
          const x2 = 800 + Math.cos(a) * 275;
          const y2 = 450 + Math.sin(a) * 225;
          return `<path class="pollen-spine" d="M${x1} ${y1}L${x2} ${y2}"/>`;
        }).join('')}
        ${Array.from({ length: 18 }, (_, row) => Array.from({ length: 12 }, (_, col) => {
          const x = 625 + col * 32 + (row % 2) * 16;
          const y = 298 + row * 17;
          return `<circle class="pollen-pore" cx="${x}" cy="${y}" r="7"/>`;
        }).join('')).join('')}
        <path class="pollen-germ" d="M660 515c74 42 206 42 280 0"/>
        <ellipse class="pollen-aperture" cx="800" cy="546" rx="112" ry="38"/>
      </g>
      <g class="small-siblings">
        <ellipse cx="440" cy="670" rx="45" ry="32"/><ellipse cx="1170" cy="650" rx="55" ry="38"/>
        <ellipse cx="1220" cy="260" rx="32" ry="25"/>
      </g>`,
  },
  {
    name: 'Человек',
    caption: 'Знакомый масштаб',
    scale: 1.7,
    color: '#f5f6ff',
    art: `
      <g class="human-stage" style="transform-origin:800px 450px">
        <ellipse class="human-shadow" cx="800" cy="798" rx="155" ry="24"/>
        <path class="human-scan" d="M520 760h560M585 790h430"/>
        <g class="human-figure">
          <circle class="human-fill" cx="800" cy="245" r="63"/>
          <path class="human-fill" d="M722 327c-38 14-52 69-48 142l10 181h-44l-18 150h47l31-164 35 82 18 220h92l18-220 35-82 31 164h47l-18-150h-44l10-181c4-73-10-128-48-142-50 29-104 29-154 0Z"/>
          <path class="human-outline" d="M800 182a63 63 0 0 0-36 113c-45 19-62 75-57 158l9 197-40 138c-5 18 7 35 25 35h29l32-172 32 72 18 220c3 19 19 33 38 33h22c19 0 35-14 38-33l18-220 32-72 32 172h29c18 0 30-17 25-35l-40-138 9-197c5-83-12-139-57-158A63 63 0 0 0 800 182Z"/>
          <path class="human-detail" d="M738 651h124M800 329v390M757 362l-25 55M843 362l25 55"/>
        </g>
        <g class="dimension dimension-height">
          <path d="M470 190v590"/><path d="M450 190h40M450 780h40"/>
          <text x="400" y="468">1,75 м</text>
        </g>
        <g class="body-scan fx-scan"><path d="M650 350h300"/></g>
      </g>
      <text class="scene-caption" x="800" y="865" text-anchor="middle">ОТКРЫТАЯ СИСТЕМА В МАСШТАБЕ 1:1</text>`,
  },
  {
    name: 'Архитектура',
    caption: 'Человек становится точкой',
    scale: 200,
    color: '#8cd8ff',
    art: `
      <g class="building-stage" style="transform-origin:800px 450px">
        <path class="ground-grid" d="M210 770H1390M280 805h1020M360 840h860M470 875h660"/>
        <path class="building-shadow" d="M535 754 800 500 1035 742 930 790H620Z"/>
        <path class="tower-side" d="M650 200h210l105 555H650Z"/>
        <path class="tower-face" d="M650 200h210v555H650Z"/>
        <path class="tower-crown" d="M650 200 710 128h90l60 72Z"/>
        <path class="tower-spine" d="M755 128v627"/>
        ${Array.from({ length: 10 }, (_, row) => Array.from({ length: 5 }, (_, col) => `<rect class="window ${(row + col) % 4 === 0 ? 'window-lit' : ''}" x="${674 + col * 35}" y="${230 + row * 48}" width="19" height="26" rx="2"/>`).join('')).join('')}
        ${Array.from({ length: 9 }, (_, row) => Array.from({ length: 4 }, (_, col) => `<rect class="side-window" x="${880 + col * 18}" y="${222 + row * 51}" width="9" height="28"/>`).join('')).join('')}
        <path class="antenna" d="M755 128V62"/><circle class="antenna-light" cx="755" cy="62" r="9"/>
        <path class="height-line" d="M1110 62v693"/><path d="M1090 62h40M1090 755h40"/>
        <text x="1150" y="430">200 м</text>
      </g>`,
  },
  {
    name: 'Город',
    caption: 'Улицы образуют живой организм',
    scale: 1e4,
    color: '#70d7ff',
    art: `
      <g class="city-stage" style="transform-origin:800px 450px">
        <path class="city-ground" d="M110 745 475 500 1110 500 1490 745v95H110Z"/>
        <g class="city-buildings back">
          ${Array.from({ length: 14 }, (_, i) => {
            const x = 165 + i * 91;
            const h = 90 + ((i * 47) % 150);
            return `<path d="M${x} 620h72v-${h}h-72Z"/>`;
          }).join('')}
        </g>
        <g class="city-lights">
          ${Array.from({ length: 90 }, (_, i) => `<circle cx="${145 + ((i * 113) % 1320)}" cy="${485 + ((i * 73) % 225)}" r="${2 + i % 3}"/>`).join('')}
        </g>
        <g class="city-buildings front">
          ${[250, 420, 980, 1160, 1320].map((x, i) => `<path class="front-building" style="--depth:${i * 8}px" d="M${x} 720h${95 + i * 12}v-${175 + i * 34}h-${95 + i * 12}Z"/>`).join('')}
        </g>
        <path class="city-road" d="M630 780 800 510l165 270"/>
        <path class="city-road-line" d="M800 518v262"/>
        <path class="traffic traffic-a" d="M770 550l-25 27"/><path class="traffic traffic-b" d="M830 625l-20 24"/>
        <path class="city-orbit" d="M150 820C440 580 1160 580 1450 820"/>
      </g>
      <text class="scene-caption" x="800" y="100" text-anchor="middle">10 КИЛОМЕТРОВ ВПЕРЁД</text>`,
  },
  {
    name: 'Ландшафт',
    caption: 'Река прокладывает путь сквозь горы',
    scale: 3e4,
    color: '#6ee6be',
    art: `
      <g class="landscape-stage" style="transform-origin:800px 450px">
        <circle class="landscape-sun" cx="1160" cy="230" r="78"/>
        <path class="mountain mountain-back" d="M-40 690 250 355 430 555 650 280 930 690Z"/>
        <path class="snow snow-back" d="M210 400 250 355 295 400 270 390 250 416 232 390Z"/>
        <path class="mountain mountain-front" d="M-60 760 400 410 710 760Z"/>
        <path class="snow" d="M355 462 400 410 446 464 416 449 399 477 383 449Z"/>
        <path class="ridge-line" d="M-20 680 400 435 825 680M220 550 355 462 510 550"/>
        <path class="forest" d="M0 700h120l40-90 42 90h118l55-125 50 125h160l46-102 52 102h152l42-90 42 90h504v140H0Z"/>
        <g class="trees">${Array.from({ length: 30 }, (_, i) => `<path style="--tree:${i * 3}px" d="M${40 + i * 51} 700l13-35 13 35-9-5 14 29h-37l14-29Z"/>`).join('')}</g>
        <path class="river" d="M735 340c-50 120 92 155 30 250s-142 82-96 220"/>
        <path class="river-shine" d="M735 340c-50 120 92 155 30 250"/>
        <path class="land-plane" d="M95 820 765 445l740 375Z"/>
        <path class="plane" d="m750 430 8 31 32 8-32 8-8 31-8-31-32-8 32-8Z"/>
        <circle class="radar-ring" cx="750" cy="455" r="180"/>
      </g>`,
  },
  {
    name: 'Планета',
    caption: 'Голубая точка становится миром',
    scale: 1.274e7,
    color: '#4b8cff',
    art: `
      <g class="planet-stage" style="transform-origin:800px 450px">
        <circle class="planet-atmosphere" cx="800" cy="450" r="326"/>
        <circle class="planet-disc" cx="800" cy="450" r="286"/>
        <g class="continents">
          <path d="M626 279c75-51 180-37 217 7 30 37-12 68 21 96 46 39 128-4 171 46 29 34-12 79-62 86-61 9-88-18-123 29-31 43-4 119-57 147-52 28-106-51-100-112 4-43 49-65 17-106-30-38-106-27-145-70-33-37-24-91 61-123Z"/>
          <path d="M1030 320c48-6 106 31 95 78-8 33-47 37-58 72-13 41 15 91-23 109-49 22-83-45-66-90 12-31 44-49 26-87-19-41-27-74 26-82Z"/>
          <path d="M646 608c-48 16-95 73-61 112 34 38 94 2 126-26 29-26 24-67-9-80-17-7-36-12-56-6Z"/>
        </g>
        <g class="clouds">
          <path d="M527 375c112-65 210-7 293-58 49-30 89-11 121 17 52 45 123 23 173 57 34 24 11 62-31 64-84 4-116-38-190-7-75 31-120 35-195 2-79-35-121-50-171-75Z"/>
          <path d="M558 537c65-37 116-19 166 9 73 40 121 6 171 22 50 15 72 54 129 41 37-8 43 36 7 53-91 43-152 7-225 15-75 8-130 15-202-27-44-26-70-88-46-113Z"/>
        </g>
        <g class="fx-slow-spin planet-night" style="transform-origin:800px 450px">
          <path d="M984 201a286 286 0 0 1 58 419 321 321 0 0 1-58-419Z" fill="#071229" opacity=".48"/>
          ${Array.from({ length: 15 }, (_, i) => `<circle style="--city:${i}" cx="${1100 + (i % 5) * 18}" cy="${245 + Math.floor(i / 5) * 38}" r="3"/>`).join('')}
        </g>
        <g class="moon-orbit"><circle cx="1280" cy="270" r="28"/><circle class="moon-crater" cx="1272" cy="262" r="5"/><circle class="moon-crater" cx="1287" cy="278" r="4"/></g>
      </g>
      <g class="annotation"><path d="M1030 710 1240 790h180"/><text x="1245" y="780">12 742 КМ</text></g>`,
  },
  {
    name: 'Солнечная система',
    caption: 'Планеты живут в одном ритме',
    scale: 3e12,
    color: '#ffb954',
    art: `
      <g class="solar-stage" style="transform-origin:800px 450px">
        <circle class="solar-glow" cx="800" cy="450" r="250"/>
        <circle class="sun" cx="800" cy="450" r="82"/>
        <g class="sun-storm"><path d="M760 400c40 25 80-25 120 5M744 440c55 20 100-20 155 5M760 500c40-25 80 25 120-5"/></g>
        <g class="orbits">
          <ellipse cx="800" cy="450" rx="155" ry="78"/><ellipse cx="800" cy="450" rx="240" ry="120"/><ellipse cx="800" cy="450" rx="340" ry="170"/><ellipse cx="800" cy="450" rx="460" ry="230"/><ellipse cx="800" cy="450" rx="610" ry="305"/>
        </g>
        <g class="solar-planets">
          <circle class="mercury" cx="915" cy="450" r="8"/><circle class="venus" cx="1010" cy="410" r="13"/>
          <circle class="earth-planet" cx="800" cy="620" r="14"/><path class="earth-land" d="M792 612c5-9 14-2 12 4-3 8-14 5-12-4Z"/>
          <circle class="mars" cx="800" cy="280" r="10"/><circle class="jupiter" cx="800" cy="680" r="31"/><path class="jupiter-band" d="M774 676h52M776 690h48"/>
          <circle class="saturn" cx="800" cy="220" r="23"/><ellipse class="saturn-ring" cx="800" cy="220" rx="48" ry="14" transform="rotate(-12 800 220)"/>
        </g>
        <path class="trajectory" d="M300 650C520 840 1110 820 1315 540"/>
        <circle class="probe" cx="1010" cy="650" r="7"/>
      </g>
      <text class="scene-caption" x="800" y="80" text-anchor="middle">ПЕРИОДЫ ОБРАЩЕНИЯ — 88 ДНЕЙ → 165 ЛЕТ</text>`,
  },
  {
    name: 'Звёздное соседство',
    caption: 'Соседи светятся в общем поле',
    scale: 3e17,
    color: '#9ec7ff',
    art: `
      <g class="neighborhood" style="transform-origin:800px 450px">
        <path class="space-grid" d="M260 210h1080M210 450h1180M260 690h1080M420 120v660M800 70v760M1180 120v660"/>
        <g class="constellation constellation-a"><path d="M390 630 510 475 650 530 740 390 890 480 1030 300 1170 390"/><circle cx="390" cy="630" r="7"/><circle cx="510" cy="475" r="5"/><circle cx="650" cy="530" r="9"/><circle cx="740" cy="390" r="5"/><circle cx="890" cy="480" r="7"/><circle cx="1030" cy="300" r="5"/><circle cx="1170" cy="390" r="8"/></g>
        <g class="constellation constellation-b"><path d="M480 230 560 335 700 280 815 365 930 230 1080 300"/><circle cx="480" cy="230" r="4"/><circle cx="560" cy="335" r="6"/><circle cx="700" cy="280" r="4"/><circle cx="815" cy="365" r="8"/><circle cx="930" cy="230" r="4"/><circle cx="1080" cy="300" r="6"/></g>
        <g class="solar-marker"><circle cx="800" cy="450" r="16"/><circle class="solar-pulse" cx="800" cy="450" r="38"/><path d="M800 405v-35M800 530v35M755 450h-35M880 450h35"/></g>
        ${Array.from({ length: 38 }, (_, i) => {
          const x = 260 + ((i * 239) % 1080);
          const y = 130 + ((i * 151) % 590);
          return `<circle class="catalog-star star-${i % 4}" style="--x:${x}px;--y:${y}px;--delay:${i * 0.1}" cx="${x}" cy="${y}" r="${3 + i % 6}"/>`;
        }).join('')}
        <text class="map-label" x="800" y="735" text-anchor="middle">СОЛНЕЧНАЯ СИСТЕМА</text>
      </g>`,
  },
  {
    name: 'Галактика',
    caption: 'Сотни миллиардов звёзд',
    scale: 1e21,
    color: '#d69cff',
    art: `
      <g class="galaxy-stage" style="transform-origin:800px 450px">
        <ellipse class="galaxy-halo" cx="800" cy="450" rx="620" ry="225"/>
        <g class="galaxy-arms">
          <path d="M230 450C340 220 620 205 800 450S1260 680 1370 450"/>
          <path d="M270 380C430 185 660 280 800 450S1190 710 1350 535"/>
          <path d="M245 520C370 715 620 695 800 450S1220 220 1350 365"/>
          <path d="M305 585C450 755 670 630 800 450S1180 275 1320 420"/>
        </g>
        <ellipse class="galaxy-disc" cx="800" cy="450" rx="555" ry="190"/>
        <ellipse class="galaxy-core-glow" cx="800" cy="450" rx="210" ry="105" fill="url(#galaxy)"/>
        <ellipse class="galaxy-core" cx="800" cy="450" rx="90" ry="48"/>
        <path class="galaxy-dust" d="M340 470C510 350 660 390 800 450s295 80 460 0"/>
        <g class="galaxy-stars">${Array.from({ length: 120 }, (_, i) => {
          const a = i * 2.399;
          const r = Math.sqrt(i / 120);
          const x = 800 + Math.cos(a) * r * 520;
          const y = 450 + Math.sin(a) * r * 170;
          return `<circle style="--gx:${x}px;--gy:${y}px;--delay:${i}" cx="${x}" cy="${y}" r="${1 + i % 4}"/>`;
        }).join('')}</g>
        <path class="galaxy-spin" d="M380 630c170 155 690 150 840-35"/>
        <path class="galaxy-spin-head" d="m1192 578 28 17-14 27"/>
      </g>
      <text class="scene-caption" x="800" y="780" text-anchor="middle">ДИАМЕТР ОКОЛО 100 000 СВЕТОВЫХ ЛЕТ</text>`,
  },
  {
    name: 'Скопление галактик',
    caption: 'Гравитация собирает острова вселенных',
    scale: 1e23,
    color: '#ffb0d4',
    art: `
      <g class="cluster-stage" style="transform-origin:800px 450px">
        <path class="cluster-field" d="M180 700C330 260 570 680 720 340S1110 240 1250 500s110 240 180 200"/>
        <path class="cluster-field" d="M280 230C520 610 750 250 930 540s300 200 420 30"/>
        ${[
          [360, 310, 74, -12], [600, 580, 112, 24], [900, 285, 82, -20], [1130, 560, 138, 12], [1230, 350, 62, 30], [480, 700, 66, -28], [800, 470, 46, 8],
        ].map(([x, y, rx, rot], i) => `<g class="mini-galaxy" style="transform-origin:${x}px ${y}px;--rot:${rot}deg" transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="${rx}" ry="${rx * 0.32}" fill="url(#galaxy)" opacity=".68"/><path d="M${-rx * 0.75} 0Q0 ${-rx * 0.55} ${rx * 0.75} 0" fill="none"/><ellipse rx="${rx * 0.28}" ry="${rx * 0.11}" class="mini-core"/><circle class="galaxy-star" cx="${(i * 17) % rx}" cy="${(i * 9) % (rx / 2)}" r="3"/></g>`).join('')}
        <g class="cluster-hotspot"><circle cx="1050" cy="470" r="45"/><circle r="80"/><circle r="118"/></g>
        <path class="lensing-arc" d="M965 380a160 160 0 0 0 175 180"/>
        <path class="lensing-arc lensing-arc-2" d="M720 300a220 220 0 0 1 270 45"/>
      </g>
      <text class="scene-caption" x="800" y="815" text-anchor="middle">ТЯЖЕСТЬ ИСКРИВЛЯЕТ СВЕТ МИЛЛИАРДОВ ЛЕТ НАЗАД</text>`,
  },
  {
    name: 'Космическая паутина',
    caption: 'Гравитационная сеть материи',
    scale: 1e25,
    color: '#8bb8ff',
    art: `
      <g class="web-stage" style="transform-origin:800px 450px">
        <g class="web-edges">
          ${[
            [130,220,360,150,520,300,800,120,1070,270,1320,140], [130,220,220,480,520,300,600,520,800,120], [220,480,120,720,360,780,600,520,800,770,1070,700,1320,760], [520,300,800,770,1070,270], [800,120,1070,700,1400,480], [600,520,1070,270], [1070,700,1320,360], [360,780,800,770], [120,720,220,480], [1320,140,1400,480]
          ].map((coords, i) => {
            const points = Array.from({ length: coords.length / 2 }, (_, point) => [coords[point * 2], coords[point * 2 + 1]]);
            const path = points.map(([x, y], point) => `${point === 0 ? 'M' : 'L'}${x} ${y}`).join('');
            return `<path style="--edge:${i}" class="web-edge" d="${path}"/>`;
          }).join('')}
        </g>
        <g class="web-nodes">
          ${[[130,220],[360,150],[520,300],[800,120],[1070,270],[1320,140],[220,480],[120,720],[360,780],[600,520],[800,770],[1070,700],[1320,360],[1400,480],[1320,760]].map(([x, y], i) => `<g class="web-node node-${i % 4}" style="--node:${i}"><circle cx="${x}" cy="${y}" r="${8 + i % 5 * 3}"/><circle class="node-halo" cx="${x}" cy="${y}" r="${26 + i % 3 * 12}"/></g>`).join('')}
        </g>
        <g class="voids"><ellipse cx="700" cy="420" rx="105" ry="80"/><ellipse cx="1200" cy="550" rx="82" ry="62"/></g>
        <g class="flow-particles">${Array.from({ length: 10 }, (_, i) => `<circle style="--flow:${i * 10}%" r="5"/>`).join('')}</g>
      </g>
      <text class="scene-caption" x="800" y="835" text-anchor="middle">БОЛЬШАЯ ЧАСТЬ ОБЪЁМА — ПУСТОТА</text>`,
  },
  {
    name: 'Наблюдаемая Вселенная',
    caption: 'Весь горизонт событий, который мы можем увидеть',
    scale: 8.8e26,
    color: '#fff1c7',
    art: `
      <g class="universe-stage" style="transform-origin:800px 450px">
        <circle class="universe-halo" cx="800" cy="450" r="370"/>
        <circle class="universe-shell" cx="800" cy="450" r="326"/>
        <g class="cmb-map">
          <path d="M535 370c68-87 184-112 282-83 75 22 98 74 169 95 69 20 116 77 94 150-18 61-87 87-151 102-101 24-214 8-294-43-91-58-151-146-100-221Z"/>
          <path d="M650 300c62 32 95 91 91 151-4 67-52 105-38 161 13 52 73 66 103 104M910 296c-40 47-56 105-39 163 18 63 76 98 81 158M565 500c82-28 151-19 225 21"/>
        </g>
        <g class="universe-depth">
          ${Array.from({ length: 65 }, (_, i) => {
            const a = i * 2.399;
            const r = Math.sqrt(i / 65);
            const x = 800 + Math.cos(a) * r * 292;
            const y = 450 + Math.sin(a) * r * 292;
            return `<circle style="--depth:${i}" cx="${x}" cy="${y}" r="${1 + i % 4}"/>`;
          }).join('')}
        </g>
        <ellipse class="horizon-ring" cx="800" cy="450" rx="326" ry="96" transform="rotate(-14 800 450)"/>
        <g class="horizon-points"><circle cx="800" cy="124" r="8"/><circle cx="1110" cy="375" r="6"/><circle cx="650" cy="710" r="7"/></g>
        <path class="universe-vector" d="M800 450 1030 300"/>
        <path class="universe-vector-head" d="m1030 300-20 10 12 19"/>
      </g>
      <g class="final-label">
        <text x="800" y="830" text-anchor="middle">93 МИЛЛИАРДА СВЕТОВЫХ ЛЕТ</text>
        <text x="800" y="860" text-anchor="middle">ГРАНИЦА НЕ ОЗНАЧАЕТ КРАЙ ВСЕЛЕННОЙ</text>
      </g>`,
  },
];

const $ = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
};

const sceneLevels = $<SVGGElement>('#scene-levels');
const deepSpace = $<SVGGElement>('#deep-space');
const app = $<HTMLElement>('#app');
const scaleValue = $<HTMLElement>('#scale-value');
const levelIndex = $<HTMLElement>('#level-index');
const levelName = $<HTMLElement>('#level-name');
const levelCaption = $<HTMLElement>('#level-caption');
const unitCaption = $<HTMLElement>('#unit-caption');
const trackFill = $<HTMLElement>('#zoom-track-fill');
const trackThumb = $<HTMLElement>('#zoom-track-thumb');
const nav = $<HTMLElement>('#level-nav');
const announcer = $<HTMLElement>('#announcer');
const aboutPanel = $<HTMLElement>('#about-panel');
const aboutButton = $<HTMLButtonElement>('#about-button');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalize = (value: number) => clamp((value - MIN_LOG) / (MAX_LOG - MIN_LOG), 0, 1);
const levelLogs = levels.map((level) => Math.log10(level.scale));

let currentLog = HUMAN_LOG;
let targetLog = HUMAN_LOG;
let worldPhase = 0;
let previousTime = performance.now();
let previousActiveIndex = 5;
let dragging = false;
let dragY = 0;
let dragOriginLog = HUMAN_LOG;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStars() {
  const random = mulberry32(42);
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 190; i += 1) {
    const star = document.createElementNS(SVG_NS, 'circle');
    star.setAttribute('cx', String(random() * 1600));
    star.setAttribute('cy', String(random() * 900));
    star.setAttribute('r', String(0.5 + random() * 1.8));
    star.setAttribute('class', `space-star star-${i % 4}`);
    star.style.setProperty('--x', `${Math.random() * 8 - 4}px`);
    star.style.setProperty('--y', `${Math.random() * 8 - 4}px`);
    star.style.setProperty('--delay', String(i * 0.17));
    fragment.append(star);
  }
  deepSpace.append(fragment);
}

function createScenes() {
  const fragment = document.createDocumentFragment();
  levels.forEach((level, index) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'scene-level');
    group.dataset.index = String(index);
    group.setAttribute('aria-hidden', 'true');
    group.innerHTML = `<rect class="level-tint" width="1600" height="900" fill="${level.color}"/>${level.art}`;
    fragment.append(group);
  });
  sceneLevels.append(fragment);
}

function createNav() {
  const fragment = document.createDocumentFragment();
  levels.forEach((level, index) => {
    const position = normalize(Math.log10(level.scale));
    const button = document.createElement('button');
    button.className = 'level-button';
    button.type = 'button';
    button.style.setProperty('--position', `${position * 100}%`);
    button.setAttribute('aria-label', `${level.name}, ${formatScale(level.scale)}`);
    button.innerHTML = `<span class="level-dot"></span><span class="level-tooltip">${String(index + 1).padStart(2, '0')} · ${level.name}</span>`;
    button.addEventListener('click', () => setTarget(levelLogs[index], true));
    fragment.append(button);
  });
  nav.append(fragment);
}

function setTarget(logValue: number, announce = false) {
  const next = clamp(logValue, MIN_LOG, MAX_LOG);
  targetLog = next;
  if (announce) {
    const nearest = nearestLevelIndex(next);
    announcer.textContent = `Масштаб: ${levels[nearest].name}, ${formatScale(10 ** next)}`;
  }
}

function zoomBy(decades: number) {
  setTarget(targetLog + decades, true);
}

function formatScientific(value: number): { mantissa: string; exponent: string } {
  const exponent = Math.floor(Math.log10(value));
  const mantissa = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 10 ** exponent);
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sign = exponent < 0 ? '⁻' : '';
  return {
    mantissa,
    exponent: `${sign}${String(Math.abs(exponent)).split('').map((digit) => superscripts[Number(digit)]).join('')}`,
  };
}

function formatScale(value: number): string {
  if (value >= 0.1 && value < 100_000) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} м`;
  }
  const { mantissa, exponent } = formatScientific(value);
  return `${mantissa} · 10${exponent} м`;
}

function formatUnitCaption(value: number): string {
  const { mantissa, exponent } = formatScientific(value);
  return `${mantissa} · 10${exponent} МЕТ${value > 1 ? 'РА' : 'РОВ'}`;
}

function nearestLevelIndex(logValue: number): number {
  let nearest = 0;
  let distance = Infinity;
  levelLogs.forEach((levelLog, index) => {
    const nextDistance = Math.abs(levelLog - logValue);
    if (nextDistance < distance) {
      distance = nextDistance;
      nearest = index;
    }
  });
  return nearest;
}

function updateReadout() {
  const currentScale = 10 ** currentLog;
  const progress = normalize(currentLog);
  const activeIndex = nearestLevelIndex(currentLog);
  const level = levels[activeIndex];

  scaleValue.textContent = formatScale(currentScale);
  levelIndex.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`;
  levelName.textContent = level.name;
  levelName.style.setProperty('--level-color', level.color);
  levelCaption.textContent = level.caption;
  unitCaption.textContent = formatUnitCaption(currentScale);
  trackFill.style.height = `${progress * 100}%`;
  trackThumb.style.top = `${progress * 100}%`;
  app.style.setProperty('--zoom-progress', `${progress * 100}%`);
  app.style.setProperty('--level-color', level.color);

  const buttons = nav.querySelectorAll<HTMLButtonElement>('.level-button');
  buttons.forEach((button, index) => {
    button.classList.toggle('is-active', index === activeIndex);
    button.classList.toggle('is-near', Math.abs(index - activeIndex) <= 1);
    if (index === activeIndex) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });

  if (activeIndex !== previousActiveIndex) {
    $<HTMLElement>('#scene').setAttribute('aria-label', `Векторная сцена: ${level.name}`);
    previousActiveIndex = activeIndex;
  }
}

function updateScenes() {
  const groups = sceneLevels.querySelectorAll<SVGGElement>('.scene-level');
  groups.forEach((group) => {
    const index = Number(group.dataset.index);
    const delta = currentLog - levelLogs[index];
    const presence = Math.exp(-(delta * delta) * 4.7);
    const scale = 0.78 + presence * 0.22 + presence * presence * 0.035;
    const offset = clamp(delta * 18, -54, 54);
    group.style.opacity = String(presence);
    group.setAttribute('transform', `translate(${800 + offset} 450) scale(${scale}) translate(-800 -450)`);
  });
}

function animate(time: number) {
  const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  const smoothing = 1 - Math.exp(-deltaSeconds * 12);
  currentLog += (targetLog - currentLog) * smoothing;
  if (Math.abs(targetLog - currentLog) < 0.00003) currentLog = targetLog;

  const progress = normalize(currentLog);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeSpeed = (0.24 + (1 - progress) * 1.08) * (reducedMotion ? 0.18 : 1);
  worldPhase += deltaSeconds * timeSpeed;

  app.style.setProperty('--phase', worldPhase.toFixed(4));
  app.style.setProperty('--sine', Math.sin(worldPhase).toFixed(4));
  app.style.setProperty('--cosine', Math.cos(worldPhase).toFixed(4));
  app.style.setProperty('--secondary', Math.sin(worldPhase * 0.53 + 1.2).toFixed(4));
  app.style.setProperty('--deep-space-opacity', String(0.26 + progress * 0.68));

  updateScenes();
  updateReadout();
  requestAnimationFrame(animate);
}

$<HTMLButtonElement>('#zoom-in').addEventListener('click', () => zoomBy(0.55));
$<HTMLButtonElement>('#zoom-out').addEventListener('click', () => zoomBy(-0.55));
$<HTMLButtonElement>('#reset-button').addEventListener('click', () => setTarget(HUMAN_LOG, true));
$<HTMLAnchorElement>('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  setTarget(HUMAN_LOG, true);
});

$<HTMLElement>('.scene-wrap').addEventListener('wheel', (event) => {
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
  const delta = clamp(event.deltaY * unit, -240, 240);
  setTarget(targetLog - delta * (event.ctrlKey ? 0.006 : 0.00145));
}, { passive: false });

$<HTMLElement>('.scene-wrap').addEventListener('pointerdown', (event) => {
  if ((event.target as Element).closest('button, a')) return;
  dragging = true;
  dragY = event.clientY;
  dragOriginLog = targetLog;
  app.classList.add('is-dragging');
  $('.scene-wrap').setPointerCapture(event.pointerId);
});

$<HTMLElement>('.scene-wrap').addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const movement = event.clientY - dragY;
  setTarget(dragOriginLog - movement * 0.0055);
});

function endDrag(event: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  app.classList.remove('is-dragging');
  if (event.currentTarget instanceof Element && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

$<HTMLElement>('.scene-wrap').addEventListener('pointerup', endDrag);
$<HTMLElement>('.scene-wrap').addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (event) => {
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    zoomBy(0.35);
  } else if (event.key === '-' || event.key === '_') {
    event.preventDefault();
    zoomBy(-0.35);
  } else if (event.key === '0' || event.key === 'Home') {
    event.preventDefault();
    setTarget(HUMAN_LOG, true);
  } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault();
    zoomBy(event.key === 'PageUp' ? 2 : 0.35);
  } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
    event.preventDefault();
    zoomBy(event.key === 'PageDown' ? -2 : -0.35);
  } else if (event.key === 'Escape') {
    closeAbout();
  }
});

function openAbout() {
  aboutPanel.hidden = false;
  requestAnimationFrame(() => aboutPanel.classList.add('is-open'));
  aboutButton.setAttribute('aria-expanded', 'true');
}

function closeAbout() {
  aboutPanel.classList.remove('is-open');
  aboutButton.setAttribute('aria-expanded', 'false');
  window.setTimeout(() => {
    if (!aboutPanel.classList.contains('is-open')) aboutPanel.hidden = true;
  }, 260);
}

aboutButton.setAttribute('aria-expanded', 'false');
aboutButton.addEventListener('click', openAbout);
$('#about-close').addEventListener('click', closeAbout);
aboutPanel.addEventListener('click', (event) => {
  if (event.target === aboutPanel) closeAbout();
});

createStars();
createScenes();
createNav();
updateScenes();
updateReadout();
requestAnimationFrame(animate);
