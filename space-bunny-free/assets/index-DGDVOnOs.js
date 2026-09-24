(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function c(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=c(a);fetch(a.href,r)}})();const C="http://www.w3.org/2000/svg",T=1e-15,z=88e25,$=Math.log10(T),E=Math.log10(z),x=Math.log10(1.7),L=Math.PI*2,h=[{name:"Субатомный мир",caption:"Граница известной физики",scale:1e-15,color:"#6fffee",art:`
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
        ${[-260,-180,-100,100,180,260].map(t=>`<path d="M${800+t} 790v18"/>`).join("")}
        <path d="M540 799h520"/>
      </g>`},{name:"Атомное ядро",caption:"Плотнейшее привычное вещество",scale:2e-12,color:"#ffcf77",art:`
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
          ${[[800,450],[735,410],[866,408],[710,494],[850,490],[788,536],[879,548],[671,550],[737,605],[855,612],[786,668],[970,470],[645,470],[750,330],[930,562],[1040,550],[554,552],[965,620]].map(([t,e],c)=>`<circle class="nucleon ${c%2?"neutron":"proton"}" cx="${t}" cy="${e}" r="${c===0?64:53}"/>`).join("")}
        </g>
        <circle class="nucleus-glow" cx="800" cy="500" r="245"/>
      </g>
      <g class="scale-ticks">
        <path d="M610 800h380"/><path d="M610 790v20M800 786v28M990 790v20"/>
        <text x="610" y="845">2 pm</text>
      </g>`},{name:"Двойная спираль",caption:"Код жизни около двух нанометров",scale:2e-9,color:"#5affda",art:`
      <g class="fx-drift dna-wrap" style="transform-origin:800px 450px">
        <path class="dna-glow" d="M590 120C1040 220 560 300 1010 410S560 590 1010 700 590 790 700 850"/>
        <path class="dna-strand" d="M590 120C1040 220 560 300 1010 410S560 590 1010 700 590 790 700 850"/>
        <path class="dna-strand strand-b" d="M1010 120C560 220 1040 300 590 410S1040 590 590 700 1010 790 900 850"/>
        ${Array.from({length:14},(t,e)=>{const c=135+e*48,s=210*Math.sin(e*.82);return`<path class="base-pair" style="--base:${e%4*25}%;--delay:${e}" d="M${800+s} ${c}L${800-s} ${c}"/>`}).join("")}
        <circle class="dna-node" cx="800" cy="380" r="14"/>
        <circle class="dna-node node-b" cx="800" cy="620" r="14"/>
      </g>
      <g class="annotation annotation-right">
        <path d="M980 352h160"/><circle cx="980" cy="352" r="5"/>
        <text x="1155" y="345">ПАРЫ ОСНОВАНИЙ</text><text x="1155" y="372">УДЕРЖИВАЮТ СПИРАЛЬ</text>
      </g>`},{name:"Вирус",caption:"Сто нанометров сложной геометрии",scale:2e-7,color:"#b889ff",art:`
      <g class="fx-breathe" style="transform-origin:800px 450px">
        ${Array.from({length:12},(t,e)=>{const c=e/12*L,s=800+Math.cos(c)*270,a=450+Math.sin(c)*270;return`<g class="spike spike-${e%3}"><path d="M${800+Math.cos(c)*185} ${450+Math.sin(c)*185}L${s} ${a}"/><circle cx="${s}" cy="${a}" r="20"/></g>`}).join("")}
        <polygon class="capsid" points="800,180 990,250 1080,450 990,650 800,720 610,650 520,450 610,250"/>
        <polygon class="capsid-inner" points="800,240 930,290 1000,450 930,610 800,660 670,610 600,450 670,290"/>
        <path class="viral-rna" d="M670 450c35-90 72 90 108 0s73 90 109 0 73 90 109 0"/>
        <g class="ribosomes">${Array.from({length:7},(t,e)=>`<circle cx="${690+e*37}" cy="${390+e%3*60}" r="7"/>`).join("")}</g>
      </g>
      <circle class="virus-halo" cx="800" cy="450" r="330"/>`},{name:"Пыльца",caption:"Сложная архитектура размером в пылинку",scale:1e-4,color:"#f5c36b",art:`
      <g class="fx-drift" style="transform-origin:800px 450px">
        <ellipse class="pollen-halo" cx="800" cy="450" rx="320" ry="265"/>
        <ellipse class="pollen-shell" cx="800" cy="450" rx="250" ry="205"/>
        <ellipse class="pollen-inner" cx="800" cy="450" rx="194" ry="150"/>
        ${Array.from({length:24},(t,e)=>{const c=e/24*L,s=800+Math.cos(c)*210,a=450+Math.sin(c)*168,r=800+Math.cos(c)*275,n=450+Math.sin(c)*225;return`<path class="pollen-spine" d="M${s} ${a}L${r} ${n}"/>`}).join("")}
        ${Array.from({length:18},(t,e)=>Array.from({length:12},(c,s)=>{const a=625+s*32+e%2*16,r=298+e*17;return`<circle class="pollen-pore" cx="${a}" cy="${r}" r="7"/>`}).join("")).join("")}
        <path class="pollen-germ" d="M660 515c74 42 206 42 280 0"/>
        <ellipse class="pollen-aperture" cx="800" cy="546" rx="112" ry="38"/>
      </g>
      <g class="small-siblings">
        <ellipse cx="440" cy="670" rx="45" ry="32"/><ellipse cx="1170" cy="650" rx="55" ry="38"/>
        <ellipse cx="1220" cy="260" rx="32" ry="25"/>
      </g>`},{name:"Человек",caption:"Знакомый масштаб",scale:1.7,color:"#f5f6ff",art:`
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
      <text class="scene-caption" x="800" y="865" text-anchor="middle">ОТКРЫТАЯ СИСТЕМА В МАСШТАБЕ 1:1</text>`},{name:"Архитектура",caption:"Человек становится точкой",scale:200,color:"#8cd8ff",art:`
      <g class="building-stage" style="transform-origin:800px 450px">
        <path class="ground-grid" d="M210 770H1390M280 805h1020M360 840h860M470 875h660"/>
        <path class="building-shadow" d="M535 754 800 500 1035 742 930 790H620Z"/>
        <path class="tower-side" d="M650 200h210l105 555H650Z"/>
        <path class="tower-face" d="M650 200h210v555H650Z"/>
        <path class="tower-crown" d="M650 200 710 128h90l60 72Z"/>
        <path class="tower-spine" d="M755 128v627"/>
        ${Array.from({length:10},(t,e)=>Array.from({length:5},(c,s)=>`<rect class="window ${(e+s)%4===0?"window-lit":""}" x="${674+s*35}" y="${230+e*48}" width="19" height="26" rx="2"/>`).join("")).join("")}
        ${Array.from({length:9},(t,e)=>Array.from({length:4},(c,s)=>`<rect class="side-window" x="${880+s*18}" y="${222+e*51}" width="9" height="28"/>`).join("")).join("")}
        <path class="antenna" d="M755 128V62"/><circle class="antenna-light" cx="755" cy="62" r="9"/>
        <path class="height-line" d="M1110 62v693"/><path d="M1090 62h40M1090 755h40"/>
        <text x="1150" y="430">200 м</text>
      </g>`},{name:"Город",caption:"Улицы образуют живой организм",scale:1e4,color:"#70d7ff",art:`
      <g class="city-stage" style="transform-origin:800px 450px">
        <path class="city-ground" d="M110 745 475 500 1110 500 1490 745v95H110Z"/>
        <g class="city-buildings back">
          ${Array.from({length:14},(t,e)=>{const c=165+e*91,s=90+e*47%150;return`<path d="M${c} 620h72v-${s}h-72Z"/>`}).join("")}
        </g>
        <g class="city-lights">
          ${Array.from({length:90},(t,e)=>`<circle cx="${145+e*113%1320}" cy="${485+e*73%225}" r="${2+e%3}"/>`).join("")}
        </g>
        <g class="city-buildings front">
          ${[250,420,980,1160,1320].map((t,e)=>`<path class="front-building" style="--depth:${e*8}px" d="M${t} 720h${95+e*12}v-${175+e*34}h-${95+e*12}Z"/>`).join("")}
        </g>
        <path class="city-road" d="M630 780 800 510l165 270"/>
        <path class="city-road-line" d="M800 518v262"/>
        <path class="traffic traffic-a" d="M770 550l-25 27"/><path class="traffic traffic-b" d="M830 625l-20 24"/>
        <path class="city-orbit" d="M150 820C440 580 1160 580 1450 820"/>
      </g>
      <text class="scene-caption" x="800" y="100" text-anchor="middle">10 КИЛОМЕТРОВ ВПЕРЁД</text>`},{name:"Ландшафт",caption:"Река прокладывает путь сквозь горы",scale:3e4,color:"#6ee6be",art:`
      <g class="landscape-stage" style="transform-origin:800px 450px">
        <circle class="landscape-sun" cx="1160" cy="230" r="78"/>
        <path class="mountain mountain-back" d="M-40 690 250 355 430 555 650 280 930 690Z"/>
        <path class="snow snow-back" d="M210 400 250 355 295 400 270 390 250 416 232 390Z"/>
        <path class="mountain mountain-front" d="M-60 760 400 410 710 760Z"/>
        <path class="snow" d="M355 462 400 410 446 464 416 449 399 477 383 449Z"/>
        <path class="ridge-line" d="M-20 680 400 435 825 680M220 550 355 462 510 550"/>
        <path class="forest" d="M0 700h120l40-90 42 90h118l55-125 50 125h160l46-102 52 102h152l42-90 42 90h504v140H0Z"/>
        <g class="trees">${Array.from({length:30},(t,e)=>`<path style="--tree:${e*3}px" d="M${40+e*51} 700l13-35 13 35-9-5 14 29h-37l14-29Z"/>`).join("")}</g>
        <path class="river" d="M735 340c-50 120 92 155 30 250s-142 82-96 220"/>
        <path class="river-shine" d="M735 340c-50 120 92 155 30 250"/>
        <path class="land-plane" d="M95 820 765 445l740 375Z"/>
        <path class="plane" d="m750 430 8 31 32 8-32 8-8 31-8-31-32-8 32-8Z"/>
        <circle class="radar-ring" cx="750" cy="455" r="180"/>
      </g>`},{name:"Планета",caption:"Голубая точка становится миром",scale:1274e4,color:"#4b8cff",art:`
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
          ${Array.from({length:15},(t,e)=>`<circle style="--city:${e}" cx="${1100+e%5*18}" cy="${245+Math.floor(e/5)*38}" r="3"/>`).join("")}
        </g>
        <g class="moon-orbit"><circle cx="1280" cy="270" r="28"/><circle class="moon-crater" cx="1272" cy="262" r="5"/><circle class="moon-crater" cx="1287" cy="278" r="4"/></g>
      </g>
      <g class="annotation"><path d="M1030 710 1240 790h180"/><text x="1245" y="780">12 742 КМ</text></g>`},{name:"Солнечная система",caption:"Планеты живут в одном ритме",scale:3e12,color:"#ffb954",art:`
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
      <text class="scene-caption" x="800" y="80" text-anchor="middle">ПЕРИОДЫ ОБРАЩЕНИЯ — 88 ДНЕЙ → 165 ЛЕТ</text>`},{name:"Звёздное соседство",caption:"Соседи светятся в общем поле",scale:3e17,color:"#9ec7ff",art:`
      <g class="neighborhood" style="transform-origin:800px 450px">
        <path class="space-grid" d="M260 210h1080M210 450h1180M260 690h1080M420 120v660M800 70v760M1180 120v660"/>
        <g class="constellation constellation-a"><path d="M390 630 510 475 650 530 740 390 890 480 1030 300 1170 390"/><circle cx="390" cy="630" r="7"/><circle cx="510" cy="475" r="5"/><circle cx="650" cy="530" r="9"/><circle cx="740" cy="390" r="5"/><circle cx="890" cy="480" r="7"/><circle cx="1030" cy="300" r="5"/><circle cx="1170" cy="390" r="8"/></g>
        <g class="constellation constellation-b"><path d="M480 230 560 335 700 280 815 365 930 230 1080 300"/><circle cx="480" cy="230" r="4"/><circle cx="560" cy="335" r="6"/><circle cx="700" cy="280" r="4"/><circle cx="815" cy="365" r="8"/><circle cx="930" cy="230" r="4"/><circle cx="1080" cy="300" r="6"/></g>
        <g class="solar-marker"><circle cx="800" cy="450" r="16"/><circle class="solar-pulse" cx="800" cy="450" r="38"/><path d="M800 405v-35M800 530v35M755 450h-35M880 450h35"/></g>
        ${Array.from({length:38},(t,e)=>{const c=260+e*239%1080,s=130+e*151%590;return`<circle class="catalog-star star-${e%4}" style="--x:${c}px;--y:${s}px;--delay:${e*.1}" cx="${c}" cy="${s}" r="${3+e%6}"/>`}).join("")}
        <text class="map-label" x="800" y="735" text-anchor="middle">СОЛНЕЧНАЯ СИСТЕМА</text>
      </g>`},{name:"Галактика",caption:"Сотни миллиардов звёзд",scale:1e21,color:"#d69cff",art:`
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
        <g class="galaxy-stars">${Array.from({length:120},(t,e)=>{const c=e*2.399,s=Math.sqrt(e/120),a=800+Math.cos(c)*s*520,r=450+Math.sin(c)*s*170;return`<circle style="--gx:${a}px;--gy:${r}px;--delay:${e}" cx="${a}" cy="${r}" r="${1+e%4}"/>`}).join("")}</g>
        <path class="galaxy-spin" d="M380 630c170 155 690 150 840-35"/>
        <path class="galaxy-spin-head" d="m1192 578 28 17-14 27"/>
      </g>
      <text class="scene-caption" x="800" y="780" text-anchor="middle">ДИАМЕТР ОКОЛО 100 000 СВЕТОВЫХ ЛЕТ</text>`},{name:"Скопление галактик",caption:"Гравитация собирает острова вселенных",scale:1e23,color:"#ffb0d4",art:`
      <g class="cluster-stage" style="transform-origin:800px 450px">
        <path class="cluster-field" d="M180 700C330 260 570 680 720 340S1110 240 1250 500s110 240 180 200"/>
        <path class="cluster-field" d="M280 230C520 610 750 250 930 540s300 200 420 30"/>
        ${[[360,310,74,-12],[600,580,112,24],[900,285,82,-20],[1130,560,138,12],[1230,350,62,30],[480,700,66,-28],[800,470,46,8]].map(([t,e,c,s],a)=>`<g class="mini-galaxy" style="transform-origin:${t}px ${e}px;--rot:${s}deg" transform="translate(${t} ${e}) rotate(${s})"><ellipse rx="${c}" ry="${c*.32}" fill="url(#galaxy)" opacity=".68"/><path d="M${-c*.75} 0Q0 ${-c*.55} ${c*.75} 0" fill="none"/><ellipse rx="${c*.28}" ry="${c*.11}" class="mini-core"/><circle class="galaxy-star" cx="${a*17%c}" cy="${a*9%(c/2)}" r="3"/></g>`).join("")}
        <g class="cluster-hotspot"><circle cx="1050" cy="470" r="45"/><circle r="80"/><circle r="118"/></g>
        <path class="lensing-arc" d="M965 380a160 160 0 0 0 175 180"/>
        <path class="lensing-arc lensing-arc-2" d="M720 300a220 220 0 0 1 270 45"/>
      </g>
      <text class="scene-caption" x="800" y="815" text-anchor="middle">ТЯЖЕСТЬ ИСКРИВЛЯЕТ СВЕТ МИЛЛИАРДОВ ЛЕТ НАЗАД</text>`},{name:"Космическая паутина",caption:"Гравитационная сеть материи",scale:1e25,color:"#8bb8ff",art:`
      <g class="web-stage" style="transform-origin:800px 450px">
        <g class="web-edges">
          ${[[130,220,360,150,520,300,800,120,1070,270,1320,140],[130,220,220,480,520,300,600,520,800,120],[220,480,120,720,360,780,600,520,800,770,1070,700,1320,760],[520,300,800,770,1070,270],[800,120,1070,700,1400,480],[600,520,1070,270],[1070,700,1320,360],[360,780,800,770],[120,720,220,480],[1320,140,1400,480]].map((t,e)=>{const s=Array.from({length:t.length/2},(a,r)=>[t[r*2],t[r*2+1]]).map(([a,r],n)=>`${n===0?"M":"L"}${a} ${r}`).join("");return`<path style="--edge:${e}" class="web-edge" d="${s}"/>`}).join("")}
        </g>
        <g class="web-nodes">
          ${[[130,220],[360,150],[520,300],[800,120],[1070,270],[1320,140],[220,480],[120,720],[360,780],[600,520],[800,770],[1070,700],[1320,360],[1400,480],[1320,760]].map(([t,e],c)=>`<g class="web-node node-${c%4}" style="--node:${c}"><circle cx="${t}" cy="${e}" r="${8+c%5*3}"/><circle class="node-halo" cx="${t}" cy="${e}" r="${26+c%3*12}"/></g>`).join("")}
        </g>
        <g class="voids"><ellipse cx="700" cy="420" rx="105" ry="80"/><ellipse cx="1200" cy="550" rx="82" ry="62"/></g>
        <g class="flow-particles">${Array.from({length:10},(t,e)=>`<circle style="--flow:${e*10}%" r="5"/>`).join("")}</g>
      </g>
      <text class="scene-caption" x="800" y="835" text-anchor="middle">БОЛЬШАЯ ЧАСТЬ ОБЪЁМА — ПУСТОТА</text>`},{name:"Наблюдаемая Вселенная",caption:"Весь горизонт событий, который мы можем увидеть",scale:88e25,color:"#fff1c7",art:`
      <g class="universe-stage" style="transform-origin:800px 450px">
        <circle class="universe-halo" cx="800" cy="450" r="370"/>
        <circle class="universe-shell" cx="800" cy="450" r="326"/>
        <g class="cmb-map">
          <path d="M535 370c68-87 184-112 282-83 75 22 98 74 169 95 69 20 116 77 94 150-18 61-87 87-151 102-101 24-214 8-294-43-91-58-151-146-100-221Z"/>
          <path d="M650 300c62 32 95 91 91 151-4 67-52 105-38 161 13 52 73 66 103 104M910 296c-40 47-56 105-39 163 18 63 76 98 81 158M565 500c82-28 151-19 225 21"/>
        </g>
        <g class="universe-depth">
          ${Array.from({length:65},(t,e)=>{const c=e*2.399,s=Math.sqrt(e/65),a=800+Math.cos(c)*s*292,r=450+Math.sin(c)*s*292;return`<circle style="--depth:${e}" cx="${a}" cy="${r}" r="${1+e%4}"/>`}).join("")}
        </g>
        <ellipse class="horizon-ring" cx="800" cy="450" rx="326" ry="96" transform="rotate(-14 800 450)"/>
        <g class="horizon-points"><circle cx="800" cy="124" r="8"/><circle cx="1110" cy="375" r="6"/><circle cx="650" cy="710" r="7"/></g>
        <path class="universe-vector" d="M800 450 1030 300"/>
        <path class="universe-vector-head" d="m1030 300-20 10 12 19"/>
      </g>
      <g class="final-label">
        <text x="800" y="830" text-anchor="middle">93 МИЛЛИАРДА СВЕТОВЫХ ЛЕТ</text>
        <text x="800" y="860" text-anchor="middle">ГРАНИЦА НЕ ОЗНАЧАЕТ КРАЙ ВСЕЛЕННОЙ</text>
      </g>`}],l=t=>{const e=document.querySelector(t);if(!e)throw new Error(`Missing required element: ${t}`);return e},P=l("#scene-levels"),U=l("#deep-space"),o=l("#app"),G=l("#scale-value"),Y=l("#level-index"),S=l("#level-name"),R=l("#level-caption"),V=l("#unit-caption"),B=l("#zoom-track-fill"),K=l("#zoom-track-thumb"),_=l("#level-nav"),X=l("#announcer"),p=l("#about-panel"),m=l("#about-button"),M=(t,e,c)=>Math.min(c,Math.max(e,t)),b=t=>M((t-$)/(E-$),0,1),w=h.map(t=>Math.log10(t.scale));let i=x,d=x,u=0,k=performance.now(),j=5,f=!1,Z=0,q=x;function Q(t){return()=>{let e=t+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function J(){const t=Q(42),e=document.createDocumentFragment();for(let c=0;c<190;c+=1){const s=document.createElementNS(C,"circle");s.setAttribute("cx",String(t()*1600)),s.setAttribute("cy",String(t()*900)),s.setAttribute("r",String(.5+t()*1.8)),s.setAttribute("class",`space-star star-${c%4}`),s.style.setProperty("--x",`${Math.random()*8-4}px`),s.style.setProperty("--y",`${Math.random()*8-4}px`),s.style.setProperty("--delay",String(c*.17)),e.append(s)}U.append(e)}function W(){const t=document.createDocumentFragment();h.forEach((e,c)=>{const s=document.createElementNS(C,"g");s.setAttribute("class","scene-level"),s.dataset.index=String(c),s.setAttribute("aria-hidden","true"),s.innerHTML=`<rect class="level-tint" width="1600" height="900" fill="${e.color}"/>${e.art}`,t.append(s)}),P.append(t)}function e0(){const t=document.createDocumentFragment();h.forEach((e,c)=>{const s=b(Math.log10(e.scale)),a=document.createElement("button");a.className="level-button",a.type="button",a.style.setProperty("--position",`${s*100}%`),a.setAttribute("aria-label",`${e.name}, ${v(e.scale)}`),a.innerHTML=`<span class="level-dot"></span><span class="level-tooltip">${String(c+1).padStart(2,"0")} · ${e.name}</span>`,a.addEventListener("click",()=>g(w[c],!0)),t.append(a)}),_.append(t)}function g(t,e=!1){const c=M(t,$,E);if(d=c,e){const s=F(c);X.textContent=`Масштаб: ${h[s].name}, ${v(10**c)}`}}function y(t){g(d+t,!0)}function D(t){const e=Math.floor(Math.log10(t)),c=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(t/10**e),s="⁰¹²³⁴⁵⁶⁷⁸⁹",a=e<0?"⁻":"";return{mantissa:c,exponent:`${a}${String(Math.abs(e)).split("").map(r=>s[Number(r)]).join("")}`}}function v(t){if(t>=.1&&t<1e5)return`${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(t)} м`;const{mantissa:e,exponent:c}=D(t);return`${e} · 10${c} м`}function t0(t){const{mantissa:e,exponent:c}=D(t);return`${e} · 10${c} МЕТ${t>1?"РА":"РОВ"}`}function F(t){let e=0,c=1/0;return w.forEach((s,a)=>{const r=Math.abs(s-t);r<c&&(c=r,e=a)}),e}function N(){const t=10**i,e=b(i),c=F(i),s=h[c];G.textContent=v(t),Y.textContent=`${String(c+1).padStart(2,"0")} / ${String(h.length).padStart(2,"0")}`,S.textContent=s.name,S.style.setProperty("--level-color",s.color),R.textContent=s.caption,V.textContent=t0(t),B.style.height=`${e*100}%`,K.style.top=`${e*100}%`,o.style.setProperty("--zoom-progress",`${e*100}%`),o.style.setProperty("--level-color",s.color),_.querySelectorAll(".level-button").forEach((r,n)=>{r.classList.toggle("is-active",n===c),r.classList.toggle("is-near",Math.abs(n-c)<=1),n===c?r.setAttribute("aria-current","step"):r.removeAttribute("aria-current")}),c!==j&&(l("#scene").setAttribute("aria-label",`Векторная сцена: ${s.name}`),j=c)}function I(){P.querySelectorAll(".scene-level").forEach(e=>{const c=Number(e.dataset.index),s=i-w[c],a=Math.exp(-(s*s)*4.7),r=.78+a*.22+a*a*.035,n=M(s*18,-54,54);e.style.opacity=String(a),e.setAttribute("transform",`translate(${800+n} 450) scale(${r}) translate(-800 -450)`)})}function H(t){const e=Math.min((t-k)/1e3,.05);k=t;const c=1-Math.exp(-e*12);i+=(d-i)*c,Math.abs(d-i)<3e-5&&(i=d);const s=b(i),a=window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=(.24+(1-s)*1.08)*(a?.18:1);u+=e*r,o.style.setProperty("--phase",u.toFixed(4)),o.style.setProperty("--sine",Math.sin(u).toFixed(4)),o.style.setProperty("--cosine",Math.cos(u).toFixed(4)),o.style.setProperty("--secondary",Math.sin(u*.53+1.2).toFixed(4)),o.style.setProperty("--deep-space-opacity",String(.26+s*.68)),I(),N(),requestAnimationFrame(H)}l("#zoom-in").addEventListener("click",()=>y(.55));l("#zoom-out").addEventListener("click",()=>y(-.55));l("#reset-button").addEventListener("click",()=>g(x,!0));l(".brand").addEventListener("click",t=>{t.preventDefault(),g(x,!0)});l(".scene-wrap").addEventListener("wheel",t=>{t.preventDefault();const e=t.deltaMode===1?16:t.deltaMode===2?window.innerHeight:1,c=M(t.deltaY*e,-240,240);g(d-c*(t.ctrlKey?.006:.00145))},{passive:!1});l(".scene-wrap").addEventListener("pointerdown",t=>{t.target.closest("button, a")||(f=!0,Z=t.clientY,q=d,o.classList.add("is-dragging"),l(".scene-wrap").setPointerCapture(t.pointerId))});l(".scene-wrap").addEventListener("pointermove",t=>{if(!f)return;const e=t.clientY-Z;g(q-e*.0055)});function O(t){f&&(f=!1,o.classList.remove("is-dragging"),t.currentTarget instanceof Element&&t.currentTarget.hasPointerCapture(t.pointerId)&&t.currentTarget.releasePointerCapture(t.pointerId))}l(".scene-wrap").addEventListener("pointerup",O);l(".scene-wrap").addEventListener("pointercancel",O);window.addEventListener("keydown",t=>{t.key==="+"||t.key==="="?(t.preventDefault(),y(.35)):t.key==="-"||t.key==="_"?(t.preventDefault(),y(-.35)):t.key==="0"||t.key==="Home"?(t.preventDefault(),g(x,!0)):t.key==="ArrowUp"||t.key==="PageUp"?(t.preventDefault(),y(t.key==="PageUp"?2:.35)):t.key==="ArrowDown"||t.key==="PageDown"?(t.preventDefault(),y(t.key==="PageDown"?-2:-.35)):t.key==="Escape"&&A()});function c0(){p.hidden=!1,requestAnimationFrame(()=>p.classList.add("is-open")),m.setAttribute("aria-expanded","true")}function A(){p.classList.remove("is-open"),m.setAttribute("aria-expanded","false"),window.setTimeout(()=>{p.classList.contains("is-open")||(p.hidden=!0)},260)}m.setAttribute("aria-expanded","false");m.addEventListener("click",c0);l("#about-close").addEventListener("click",A);p.addEventListener("click",t=>{t.target===p&&A()});J();W();e0();I();N();requestAnimationFrame(H);
