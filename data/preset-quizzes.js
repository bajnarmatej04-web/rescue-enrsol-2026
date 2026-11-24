// data/preset-quizzes.js
// Built-in quizzes. They are read-only in the app: users can preview, play, export
// or duplicate them, and edit the duplicate.
//
// To add another built-in quiz, add an object with the same shape to the list:
// { id: 'preset-…' (unique), title, language: 'cs' | 'en',
//   categories: [5 × { name, questions: [5 × { question, answer, note }] }] }
// The first question of each category is worth 100 points, the last 500.
// The easiest way to create one: build it in the app's editor, export it to a JSON file,
// and paste the "quiz" part of that file here.
//
// Texts are written with \n where a new line should appear on screen.

window.PRESET_QUIZZES = [
  {
    // Source: "Riskuj.pdf" provided by the project owner (2026-11-20). Texts kept as written.
    id: 'preset-riskuj-klima',
    title: 'Riskuj – klima a společnost',
    language: 'cs',
    updatedAt: '2026-11-20T00:00:00.000Z',
    categories: [
      {
        name: 'Oligarchie',
        questions: [
          {
            question: 'Jakou mohou oligarchové ovlivňovat veřejné mínění? Uveďte jeden konkrétní příklad.',
            answer: 'Například nákupem médií – Mafra, Blesk atd.',
            note: ''
          },
          {
            question: 'Vyjmenuj alespoň tři z pěti nejbohatších Čechů z roku 2026 podle časopisu Forbes.',
            answer: 'Michal Strnad, Renáta Kellnerová, Daniel Křetínský, Karel Komárek, Pavel Tykač',
            note: ''
          },
          {
            question: 'Ve kterých evropských zemích působí EP Group (energeticko-průmyslová společnost) Daniela Křetínského? (alespoň 4 z 10)',
            answer: 'Česko, Německo, Francie, Švýcarsko, Nizozemí, Velká Británie, Itálie, Irsko, Slovensko',
            note: ''
          },
          {
            question: 'Jaké organizace a instituce sponzoruje Pavel Tykač? (alespoň 2)',
            answer: 'Vysoká škola CEVRO, Letní škola Občanského institutu, Aliance pro rodinu, Konzervativní noviny, Ekonomické diskuzní fórum Kostelec či Sdružení pro obranu svobody slova, Institut Václava Klause',
            note: ''
          },
          {
            question: 'V jakých třech českých krajích se v minulosti těžilo nebo stále těží uhlí, a která osoba má největší podíl na společnostech, které uhelné doly v ČR provozují/provozovaly?',
            answer: 'Ústecký, Karlovarský, Moravskoslezský – Pavel Tykač',
            note: ''
          }
        ]
      },
      {
        name: 'Historie klima hnutí a neziskovek v ČR',
        questions: [
          {
            question: 'Jak se jmenuje člověk, díky kterému FFF vzniklo, a odkud pochází?',
            answer: 'Greta Thunberg, ze Švédska',
            note: ''
          },
          {
            question: 'V jakém roce byla první stávka FFF v Česku?',
            answer: '2019',
            note: ''
          },
          {
            question: 'Jakých protestních akcí se české FFF účastnilo na podzim 2025? (alespoň 2)',
            answer: 'Brno střeží MŽP, MŽP nedáme, Walkout UZK z univerzit a středních škol, Středoškolská stávka za klima',
            note: ''
          },
          {
            question: 'Které české klimatické hnutí se (hlavně v minulosti) pomocí přímých akcí snaží zabránit pokračování těžby uhlí?',
            answer: 'Limity jsme my',
            note: ''
          },
          {
            question: 'Jaké kampaně má současně Greenpeace? (aspoň tři)',
            answer: 'Například MŽP, ochrana oceánů, hlubokomořská těžba, odlesňování, Make War Profiteers Pay, Stop Corporate Bullies atd.',
            note: ''
          }
        ]
      },
      {
        name: 'Klimatická politika',
        questions: [
          {
            question: 'Do kterého roku se Green Deal snaží dosáhnout klimatické neutrality?',
            answer: '2050',
            note: ''
          },
          {
            question: 'Ve které zemi a městě se v roce 2025 konala konference OSN o změně klimatu?',
            answer: 'Brazílie, Belém',
            note: ''
          },
          {
            question: 'Co je to spravedlivá transformace?',
            answer: 'Přechod na nízkouhlíkové zdroje energie, který bude předcházet negativním socioekonomickým dopadům a nabídne zejména obyvatelům těžbou nejvíce poškozených regionů perspektivní budoucnost.',
            note: ''
          },
          {
            question: 'Co je to decoupling a jaký je rozdíl mezi relativním a absolutním decouplingem (v ekonomii a ekologii)?',
            answer: 'Decoupling je oddělení ekonomického růstu od růstu vypouštěných emisí nebo spotřeby přírodních zdrojů. Při relativním decouplingu emise rostou, ale pomaleji než HDP, zatímco v absolutním klesají.',
            note: ''
          },
          {
            question: 'Jak se říká krajně pravicové ideologii prosazující ochranu přírody skrze potlačení lidských práv, uzavření hranic a boj proti přelidnění?',
            answer: 'Ekofašismus',
            note: ''
          }
        ]
      },
      {
        name: 'Fakta o klimatu',
        questions: [
          {
            question: 'Který sektor produkuje nejvíc emisí?',
            answer: 'Doprava',
            note: ''
          },
          {
            question: 'Které tři země historicky vypustily nejvíc emisí? (sestupně)\nEU, Austrálii a Oceánii a Jižní Ameriku berme jako jeden celek.',
            answer: 'USA, Čína, EU',
            note: ''
          },
          {
            question: 'Co se děje s oceánskou hladinou, když tají mořské ledovce?',
            answer: 'Klesá, protože led má menší hustotu než voda.',
            note: 'Zvyšování hladiny způsobují pevninské ledovce.'
          },
          {
            question: 'Jaká jsou úložiště uhlíku? (alespoň dvě)',
            answer: 'Fotosyntéza ¼, oceány ¼, atmosféra ½',
            note: ''
          },
          {
            question: 'Jaký je rozdíl mezi pozitivní a negativní zpětnou klimatickou vazbou?',
            answer: 'Zpětná klimatická vazba je proces, který reaguje na změnu teploty tím, že ji stále více zesiluje (pozitivní zpětná vazba), nebo stále více zpomaluje (negativní zpětná vazba).',
            note: ''
          }
        ]
      },
      {
        name: 'Tipování',
        questions: [
          {
            question: 'Kolik procent světové zemědělské půdy je využito na výrobu živočišných produktů?\n(tolerance 15 procent)',
            answer: '77–80 %',
            note: 'Plocha velká jako Severní a Jižní Amerika.'
          },
          {
            question: 'Za jak dlouho by se světová ekonomika při současném tempu růstu zdvojnásobila?\n(tolerance 5 let)',
            answer: 'Za 24 let',
            note: ''
          },
          {
            question: 'O kolik centimetrů se od roku 1900 zvýšila hladina oceánu?\n(tolerance 10 cm)',
            answer: 'O 20 cm',
            note: ''
          },
          {
            question: 'Kolik čerpala za posledních 10 let EP Group Daniela Křetínského z veřejných státních a evropských rozpočtů?\n(tolerance 1/5 výsledku)',
            answer: '10,4 miliard (253 miliard korun)',
            note: 'Případně vysvětlit, co je EP Group.'
          },
          {
            question: 'Ze Slunce na Zemi dopadá v podobě slunečního záření obrovské množství energie. Kolik procent z tohoto množství energie se „ukládá“ do oceánů?\n(tolerance 10 procent)',
            answer: '91 %',
            note: ''
          }
        ]
      }
    ]
  },
  {
    // English translation of the quiz above (same questions, answers and order).
    id: 'preset-riskuj-climate-en',
    title: 'Riskuj – climate and society (English)',
    language: 'en',
    updatedAt: '2026-11-21T00:00:00.000Z',
    categories: [
      {
        name: 'Oligarchy',
        questions: [
          {
            question: 'How can oligarchs influence public opinion? Give one specific example.',
            answer: 'For example, by buying media – Mafra, Blesk, etc.',
            note: ''
          },
          {
            question: 'Name at least three of the five richest Czechs in 2026 according to Forbes magazine.',
            answer: 'Michal Strnad, Renáta Kellnerová, Daniel Křetínský, Karel Komárek, Pavel Tykač',
            note: ''
          },
          {
            question: 'In which European countries does Daniel Křetínský’s EP Group (an energy and industrial company) operate? (at least 4 of 10)',
            answer: 'Czechia, Germany, France, Switzerland, the Netherlands, the United Kingdom, Italy, Ireland, Slovakia',
            note: ''
          },
          {
            question: 'Which organisations and institutions does Pavel Tykač sponsor? (at least 2)',
            answer: 'CEVRO University, the Civic Institute’s Summer School, Alliance for the Family, Konzervativní noviny (Conservative Newspaper), the Kostelec Economic Discussion Forum or the Association for the Defence of Free Speech, the Václav Klaus Institute',
            note: ''
          },
          {
            question: 'In which three Czech regions has coal been mined in the past or is still mined today, and which person holds the largest share in the companies that operate/operated coal mines in Czechia?',
            answer: 'Ústí nad Labem, Karlovy Vary, Moravian-Silesian – Pavel Tykač',
            note: ''
          }
        ]
      },
      {
        name: 'History of the climate movement and NGOs in Czechia',
        questions: [
          {
            question: 'What is the name of the person who started FFF (Fridays for Future), and where is she from?',
            answer: 'Greta Thunberg, from Sweden',
            note: ''
          },
          {
            question: 'In which year was the first FFF strike in Czechia?',
            answer: '2019',
            note: ''
          },
          {
            question: 'Which protest actions did Czech FFF take part in during autumn 2025? (at least 2)',
            answer: 'Brno střeží MŽP (Brno guards the Ministry of the Environment), MŽP nedáme (We won’t give up the Ministry of the Environment), the UZK walkout from universities and secondary schools, the Secondary School Climate Strike',
            note: ''
          },
          {
            question: 'Which Czech climate movement uses (mainly in the past) direct action to try to stop further coal mining?',
            answer: 'Limity jsme my (We Are the Limits)',
            note: ''
          },
          {
            question: 'Which campaigns is Greenpeace currently running? (at least three)',
            answer: 'For example: the Ministry of the Environment, protecting the oceans, deep-sea mining, deforestation, Make War Profiteers Pay, Stop Corporate Bullies, etc.',
            note: ''
          }
        ]
      },
      {
        name: 'Climate policy',
        questions: [
          {
            question: 'By which year does the Green Deal aim to achieve climate neutrality?',
            answer: '2050',
            note: ''
          },
          {
            question: 'In which country and city was the 2025 UN Climate Change Conference held?',
            answer: 'Brazil, Belém',
            note: ''
          },
          {
            question: 'What is a just transition?',
            answer: 'A shift to low-carbon energy sources that prevents negative socio-economic impacts and offers a promising future, especially to people in the regions most damaged by mining.',
            note: ''
          },
          {
            question: 'What is decoupling, and what is the difference between relative and absolute decoupling (in economics and ecology)?',
            answer: 'Decoupling means separating economic growth from the growth of emissions or the use of natural resources. With relative decoupling, emissions still rise, but more slowly than GDP; with absolute decoupling, they fall.',
            note: ''
          },
          {
            question: 'What is the name of the far-right ideology that promotes protecting nature by suppressing human rights, closing borders and fighting overpopulation?',
            answer: 'Ecofascism',
            note: ''
          }
        ]
      },
      {
        name: 'Climate facts',
        questions: [
          {
            question: 'Which sector produces the most emissions?',
            answer: 'Transport',
            note: ''
          },
          {
            question: 'Which three countries have historically emitted the most? (in descending order)\nCount the EU, Australia and Oceania, and South America each as one unit.',
            answer: 'USA, China, EU',
            note: ''
          },
          {
            question: 'What happens to sea level when sea ice melts?',
            answer: 'It falls, because ice is less dense than water.',
            note: 'Sea level rise is caused by land ice (glaciers and ice sheets).'
          },
          {
            question: 'What are the carbon sinks? (at least two)',
            answer: 'Photosynthesis ¼, oceans ¼, atmosphere ½',
            note: ''
          },
          {
            question: 'What is the difference between a positive and a negative climate feedback?',
            answer: 'A climate feedback is a process that responds to a change in temperature by increasingly amplifying it (positive feedback) or increasingly slowing it down (negative feedback).',
            note: ''
          }
        ]
      },
      {
        name: 'Estimates',
        questions: [
          {
            question: 'What percentage of the world’s agricultural land is used to produce animal products?\n(tolerance 15 percent)',
            answer: '77–80 %',
            note: 'An area as large as North and South America.'
          },
          {
            question: 'At the current growth rate, how long would it take the world economy to double in size?\n(tolerance 5 years)',
            answer: 'In 24 years',
            note: ''
          },
          {
            question: 'By how many centimetres has sea level risen since 1900?\n(tolerance 10 cm)',
            answer: 'By 20 cm',
            note: ''
          },
          {
            question: 'How much has Daniel Křetínský’s EP Group received from public national and European budgets over the last 10 years?\n(tolerance 1/5 of the answer)',
            answer: '10.4 billion (253 billion CZK)',
            note: 'If needed, explain what EP Group is.'
          },
          {
            question: 'A huge amount of energy reaches the Earth from the Sun as solar radiation. What percentage of this energy is “stored” in the oceans?\n(tolerance 10 percent)',
            answer: '91 %',
            note: ''
          }
        ]
      }
    ]
  }
];
