# Mmemberville resource learnings (scraped 2026-10-30, headless Chromium)


Total: 116 sites checked. Loaded: 108. Failed: 8 (Cloudflare/Vercel blocks, 404, 500). Prettyfolio loads but is a hijacked spam domain; micro.dev and Mobbin animations loaded with no useful content.


## Component & section libraries

| Name | URL | Status | Lesson |
|---|---|---|---|
| Origin Kit | https://originkit.dev | 200 loaded | Browse by job (Image Gallery 50, Interactive Elements 132): pick a real image-gallery pattern for the tee grid instead of identical cards. |
| Unsection | https://unsection.com | 200 loaded | Sections are filed by type (Hero 801, Footer 398, FAQ 162): a shop needs a real FAQ/shipping section and a footer with actual info, not just hero + grid. |
| CTA Gallery | https://cta.gallery | 200 loaded | Has a 'Call-to-Buy' CTA category separate from newsletter: the buy button should name the product and price, not a generic 'Shop now'. |
| Navbar Gallery | https://navbar.gallery | 200 loaded | Lists 'Announcement' bars as their own nav type: a thin top strip ('Blank tees, drop 001, ships Mon') is a cheap, real-shop signal. |
| Component Gallery | https://component.gallery | 200 loaded | 60 components across 95 design systems: copy states (hover, disabled, sold out) for buttons and cards so every element has more than one state. |
| Bento Grids | https://bentogrids.com | 200 loaded | Curated by Light vs Dark mode: mix one light card into a dark bento so the grid has contrast instead of one flat navy tone. |
| OG Image Gallery | https://ogimage.gallery | 200 loaded | Has a 'Stores' category: give the site a designed OG image (tee photo + stencil logo) so shared links do not look like a default Vercel card. |
| Scrolltide | https://scrolltide.co | 200 loaded | Sells scroll-driven templates as prompts: the one scroll moment should tell the product story (fabric, fit, print), not just fade sections in. |
| shadcn/ui | https://ui.shadcn.com | 200 loaded | Pitches itself as a foundation you customize: the default shadcn look is the AI-slop look, so restyle radius, font and borders from the start. |
| Aceternity UI | https://ui.aceternity.com | 200 loaded | 200+ flashy effects (Image Wave, etc.): the more of these a shop uses, the more template it looks; use at most one signature effect. |
| Magic UI | https://magicui.design | 200 loaded | Landing-page blocks are tuned for SaaS; shimmer buttons and marquees are exactly what reads as AI, avoid them on a merch store. |
| Motion Primitives | https://motion-primitives.com | 200 loaded | Small copy-paste motions (text effects, tilt, spotlight): a subtle tilt on product cards is a lightweight transform-only upgrade. |
| Uiverse | https://uiverse.io | 403 did not load | Did not load (Cloudflare 403 block). |
| 21st.dev | https://21st.dev | 200 loaded | 12,000+ components built 'for you and your AI agent': using community components unmodified is why sites look the same; change type and spacing after pasting. |
| Uiable | https://uiable.com | 200 loaded | Complete shadcn system with dashboards: not relevant to a tee shop beyond reusing a consistent token set. |
| mapcn | https://mapcn.dev | 200 loaded | Map components on MapLibre: a small 'ships from' map or location stamp could ground the brand in a real place. |
| MicroKit | https://microkit.co | 200 loaded | 54 CSS microinteractions (buttons, tabs, inputs) with no package: add a pressed/active state to the add-to-cart button using pure CSS transforms. |
| Glass (samasante) | https://glass.samasante.com | 200 loaded | Zero-dependency liquid glass in all browsers: cool, but refraction is GPU cost, skip for scroll perf. |
| Kinetics | https://kinetics.colorion.co | 200 loaded | 162 spring-animation examples: use spring easing (slight overshoot) on hover/press instead of linear ease for a less generic feel. |
| Text effects | https://text-effects.colorion.co | 200 loaded | 123 pure-CSS text effects (stencil, glitch, 3D): a stencil-spray/stamp text effect on the hero word fits the military supply theme with no JS. |
| 3dicons | https://3dicons.co | 200 loaded | Free 3D icons: these are a common AI-site tell; for a stencil theme flat line icons fit better. |
| ForgeUI | https://forgeui.in | 200 loaded | shadcn blocks for SaaS: SaaS block patterns (feature grids, pricing tiers) do not belong on a merch shop. |
| Balsa UI | https://balsa-ui.com | 200 loaded | Vue design system registry: main idea is a single design contract (tokens) that every component reads from; keep all colors in one token file. |
| Cult UI | https://cult-ui.com | 200 loaded | Animated shadcn blocks: same caution, start from a block then strip it down to the brand. |
| Nexvyn UI | https://ui.nexvyn.dev | 200 loaded | Accessible components with smooth motion: focus states and keyboard access are part of looking 'designed', not an afterthought. |
| Obsidian UI | https://obsidianui.dev | 200 loaded | Headline 'Now it's time to be different. Everyone...': their own pitch admits copy-paste libraries make everything look alike. |
| EasyUI | https://easyui.site | 200 loaded | Shows components with real data (charts, $ values): show real prices, sizes and stock counts instead of placeholder text. |
| Rare UI | https://rareui.com | 200 loaded | 'Tasteful components, made to stand out': pick rare over popular components so the site does not match every other template. |
| Pin UI | https://pinui.xyz | 403 did not load | Did not load (Vercel security checkpoint 403). |
| Kobra Input OTP | https://kobra.systems/components/input-otp | 200 loaded | Segmented code input 'with every state designed': the members password gate could use a segmented code input instead of a plain text box. |
| Spell UI | https://spell.sh | 200 loaded | Refined components for design engineers: polish lives in spacing and type, not effects. |
| Bencho | https://bencho.dev | 200 loaded | Has a 'Sounds' section next to blocks: a tiny click/stamp sound on the hidden patch button could make the easter egg feel real (opt-in). |
| SwiftPieces | https://swiftpieces.com | 200 loaded | Components ship with haptics and accessibility: on mobile, use navigator.vibrate on add-to-cart where supported. |

## Landing / web inspiration galleries

| Name | URL | Status | Lesson |
|---|---|---|---|
| Pure Landing | https://purelanding.page | 200 loaded | Has a 'Physical Product' category: study real product landing pages, which lead with large product photography. |
| Landing Love | https://landing.love | 403 did not load | Did not load (Cloudflare 403 block). |
| SaaSpo | https://saaspo.com | 403 did not load | Did not load (Cloudflare bot verification 403). |
| Webinspoo | https://webinspoo.com | 200 loaded | Filters by font and color palette: pick a palette from a real site and stick to it, rather than generating one. |
| Godly | https://godly.website | 500 did not load | Did not load (HTTP 500). |
| Curated Design | https://curated.design | 200 loaded | Reviews live sites and filters by industry: filter for e-commerce/fashion and copy section order from real stores. |
| Landdding | https://landdding.com | 200 loaded | Daily community-voted designs: check trending sites weekly so the theme does not drift into stale template styles. |
| WeDoFlow | https://wedoflow.com | 200 loaded | 1,300+ Webflow pages: lots of templates; useful mainly for e-commerce product page layouts. |
| Wonderlist | https://wonderlist.design | 200 loaded | 127 Figma templates, mostly SaaS/agency: little for a shop beyond layout grids. |
| Modulify | https://modulify.ai | 200 loaded | AI site builder: the output is the generic look you are trying to avoid. |
| Modulify templates | https://modulify.ai/templates | 200 loaded | Clone-ready templates: same; use only for layout ideas. |
| Designeer | https://designeer.xyz | 200 loaded | Mixes inspiration with portfolios and tools: study the portfolios section, those are hand-built and avoid template look. |
| Inspora | https://inspora.design | 200 loaded | Has a 'Print' and 'Branding' filter: print/packaging design is the closest reference for a tee brand, more than web UI. |
| Recent Design | https://recent.design | 200 loaded | Tracks Launch Videos as a category: a short real video of the tee being worn beats any animation. |
| Posts Design | https://posts.design | 200 loaded | What 1,010+ brands ship to socials: design the drop announcement post along with the site so they match. |
| CollectUI | https://collectui.com | 200 loaded | Daily UI curation; generic, not shop-specific. |
| SeeSaw | https://seesaw.website | 200 loaded | Has an E-Commerce category: browse that one for real store references. |
| Best Designs on X | https://bestdesignsonx.com | 200 loaded | Hourly picks incl. logos and branding: the logo/wordmark matters more than effects for a merch brand. |
| Mobbin | https://mobbin.com | 200 loaded | 621,500 shipped screens: look up real product page and cart flows on mobile, people expect the size picker and sticky add-to-cart at the bottom. |
| Mobbin animations | https://mobbin.com/discover/apps/ios/animations | 200 loaded | Loaded but showed the generic Mobbin landing (animations section needs login). |
| Appllama | https://appllama.io | 200 loaded | 81,600 screens from top-grossing apps with revenue context: copy the patterns that actually sell (clear price, one primary CTA). |
| Unslop (heydamir) | https://heydamir.design/unslop | 200 loaded | Before/after of AI screens: the fix is making the one key screen look designed (type, spacing, real content), not adding effects. Most relevant to Ever's complaint. |
| Brytonzoz | https://brytonzoz.com | 200 loaded (curl) | The reference site: one strong artist identity carries it; Mmemberville needs a real brand voice and real photos, not just matching scroll. |

## Motion & interaction

| Name | URL | Status | Lesson |
|---|---|---|---|
| App Motion | https://appmotion.design | 404 did not load | Did not load (404, Framer site not found). |
| 60fps | https://60fps.design | 200 loaded | 2,125 shots of motion from real apps: real apps animate on interaction (tap, add, open), not on scroll everywhere. |
| Motion | https://motion.dev | 200 loaded | Production animation library at tiny footprint: use it for layout/cart animations if needed; already transform/opacity friendly. |
| transitions.dev | https://transitions.dev | 200 loaded | Has a 'Motion Agent' to find janky motion: the essential set is a few UI transitions (open, close, add), keep motion to those. |
| Theatre.js | https://theatrejs.com | 200 loaded | Visual timeline editor: overkill for a tee shop. |
| anime.js | https://animejs.com | 200 loaded | Lightweight engine; fine alternative to GSAP, no reason to switch. |
| Spline | https://spline.design | 200 loaded | Interactive 3D in browser: a 3D tee viewer is possible but heavy for mobile; avoid given scroll perf. |
| Unicorn Studio | https://unicorn.studio | 200 loaded | Shader/WebGL graphics: heavy GPU, conflicts with the perf goal. |
| animos | https://animos.app | 200 loaded | Exports MP4 showcase videos in-browser: make a short product loop video for socials instead of animating the site. |
| Springs Studio | https://springs.studio | 200 loaded | Exit animations should be deliberately faster than entrances: set exits ~60-70% of enter duration. |
| Design Spells | https://designspells.com | 200 loaded | Catalogues easter eggs and 404 pages: a custom 404 in the brand voice is a cheap 'this was made by a person' signal. |
| Web Interactions | https://webinteractions.gallery | 404 did not load | Did not load (404 deployment not found). |
| Viewport UI | https://viewport-ui.design | 500 did not load | Did not load (HTTP 500). |
| Motion Zajno | https://motion.zajno.com | 200 loaded | Teaches easing, offset and delay: stagger product cards by a small offset so they do not all appear at once. |
| Motionin Design | https://motionin.design | 200 loaded | Cursor-responsive physics sections sold as prompts: desktop-only flourish, keep off mobile. |
| Reanimate | https://reanimate.niazmorshed.dev | 200 loaded | Rebuilds an animation you point it at: use it to copy one specific brytonzoz motion rather than inventing one. |

## Brand, type, icons, backgrounds

| Name | URL | Status | Lesson |
|---|---|---|---|
| Rebrand Gallery | https://rebrand.gallery | 200 loaded | Every rebrand is shown as logo + colors + typography together: define those three for Mmemberville before more UI work. |
| Prettyfolio | https://prettyfolio.com | 200 loaded (spam domain) | Domain now serves a gambling spam page; dead resource, remove from the list. |
| Hugeicons | https://hugeicons.com | 200 loaded | 60,000 icons in 10 styles: pick one style and use it everywhere (mixed icon styles look generated). |
| Iconly Pro | https://iconly.pro | 200 loaded | Flat, 3D and animated icons: same rule, one style only. |
| Iconly (design) | https://iconly.design | 200 loaded | App icon inspiration library: useful for a favicon/app icon that is not a default. |
| Uncut | https://uncut.wtf | 454 loaded | Free contemporary typefaces for commercial use (163): swap default Inter body text for a distinctive free face; loaded despite HTTP 454. |
| Fontshare | https://fontshare.com | 200 loaded | Free ITF fonts with 100 ready pairs: use a tested pair (e.g. a stencil/condensed display + a mono for specs) instead of Inter. |
| Backgrounds Supply | https://backgrounds.supply | 200 loaded | Gradients and backgrounds: gradient backgrounds are an AI tell; a real texture (canvas, ripstop) fits better. |
| Tegaki | https://gkurt.com/tegaki | 200 loaded | Handwriting animation stroke by stroke: a hand-signed tag line on hero could add a human mark; keep it to one use. |
| Meshfont | https://meshfont.com | 200 loaded | Make your own font in-browser: a custom stencil wordmark is the strongest anti-template move. |
| Design Manifestos | https://designmanifestos.org | 200 loaded | Collection led by Dieter Rams' principles: 'as little design as possible', cut decorative sections that do not sell a tee. |

## Liquid glass / WebGL / HTML-in-canvas

| Name | URL | Status | Lesson |
|---|---|---|---|
| Liquid glass (agpallav) | https://agpallav.com/liquid-glass | 200 loaded | Glass lens over live UI in all browsers: GPU-heavy, skip. |
| Canvas UI | https://canvas-ui.qwen.demos.sulat.com | 200 loaded | It is a one-shot AI demo: proof that effect-heavy pages are exactly what AI produces. |
| Interactive glass | https://glass-projects-lab-custom-demo.vercel.app | 200 loaded | Uses SVG feDisplacementMap: expensive filter, avoid for scroll perf. |
| Liquefy UI | https://liquefy-ui.com | 200 loaded | WebGL optics plus spring physics: same, not for this site. |
| Glass lens | https://glass-lens-react.vercel.app | 200 loaded | Refracts video behind it: needs a video background; not worth the cost. |
| Baked Design | https://baked.design | 200 loaded | Studio site leads with case studies: show real proof (photos, customers) up front. |
| Baked HTML-in-canvas | https://baked.design/fun/html-in-canvas | 200 loaded | Wishing Pond/underwater effect needs Chrome HTML-in-Canvas: confirms our CSS ripple fallback is the right call. |
| Margin Dragon | https://baked.design/lab/margin-dragon | 200 loaded | Text reflows around a moving object: delightful but Chrome-only canvas API. |
| Snowfall | https://baked.design/lab/snowfall | 200 loaded | Poster layout with folio number, coordinates and date: editorial details like 'No. 02, 49°N' make a page feel authored; 'LOT 001' could carry coordinates/date too. |
| Wishing Pond | https://baked.design/lab/wishing-pond | 200 loaded | A real form under water with sound: shows the easter egg works best when it does something (toss a coin), not just looks. |

## Tools & templates

| Name | URL | Status | Lesson |
|---|---|---|---|
| Toolfolio | https://toolfolio.com | 200 loaded | Tool directory; nothing shop-specific. |
| DevAtlas | https://devatlas.site | 200 loaded | Compares payments and email providers: use it when real checkout is needed. |
| Reelfolio | https://reelfolio.io | 200 loaded | Turns screenshots into video showreels: makes social promo of the site. |
| Micro | https://micro.dev | 200 loaded | Loaded but page had no readable text; no lesson. |

## Portfolios

| Name | URL | Status | Lesson |
|---|---|---|---|
| Kush Bothra | https://kushbothra.com | 200 loaded | Live clock, ruler marks and a handwriting font: small personal details beat effects. |
| Manish Kumar | https://manixh.vercel.app | 200 loaded | Generic dev portfolio; nothing to borrow. |
| Özgür Güler | https://ozgurguler.tech | 200 loaded | Whole site is a pixel village: one strong concept beats many effects. |
| Mukund Kapoor | https://mukundkapoor.com | 200 loaded | 'Press C to copy my email': a keyboard shortcut is a small, cheap delight. |
| Sahil Singh | https://sahilcodex.vercel.app | 200 loaded | Pixel font accent with Geist: one accent font for labels is enough personality. |
| Rahul Palamarthi | https://rahulgg.in | 200 loaded | Serif + sans pairing with location line: specific details ('Durgam Cheruvu') feel human. |
| Nur | https://nurlab.xyz | 200 loaded | 'Don't touch the ducks' hidden interaction: playful hidden features invite exploring, like our patch gate. |
| Ashish Gogula | https://ashishgogula.in | 200 loaded | Cares about 'how it moves, sounds and feels': the last 10% (states, sound) is what removes the template feel. |
| Dev Chauhan | https://devchauhan.in | 200 loaded | Shows live local time: a location/time stamp ('Coatzacoalcos 21:05') makes a brand feel real. |
| Anjil | https://anjil.ink | 200 loaded | Newsreader serif and writing-first: a strong typeface alone can carry a site. |
| Priyanshu Kumar | https://priyanshu.me | 200 loaded | Plain lowercase greeting, no effects: tone of voice matters. |
| Nikhil Rajpurohit | https://nikhilwho.in | 200 loaded | Google Sans Flex, compact copy: short confident copy reads less AI than long hype. |
| Saurabh Sharma | https://srbh.site | 200 loaded | Instrument Serif accents: serif italics are now a common AI-site trend, avoid copying. |
| Roy Albeck | https://royalbeck.design | 200 loaded | 'Under construction, one pixel at a time' with a pixel twin: honesty about the state of the site is charming. |

## Added from @BardhylBytyqi post (curl, 2026-10-30)

| Name | URL | Status | Lesson |
|---|---|---|---|
| Fontinlogo | https://fontinlogo.com | 200 loaded | Shows the exact fonts behind famous logos (Nike, Adidas, NYT): pick the wordmark font from a real brand reference instead of a default. |
| On Design | https://on.design | 200 loaded | Invite-only community of independent designers: a place to find a real designer for the wordmark or patch. |
| Footer Design | https://footer.design | 200 loaded | A gallery only of footers: treat the footer as a real section (contact, shipping, socials, sign-off), not a single line. |
| Refero Styles | https://styles.refero.design | 200 loaded | Each real site's style is broken into colors, type and spacing as a DESIGN.md: pull one real streetwear/supply brand's style file and use its exact type scale and spacing instead of invented values. |
| Supahero | https://supahero.io | 200 loaded | A library of hero sections only: compare real heroes and make ours lead with one product photo, one line and one buy button. |
| Godly (retry) | https://godly.website | 500 did not load | Retried with curl at 21:39 CST, still HTTP 500. |
