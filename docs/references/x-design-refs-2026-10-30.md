# Design references (from 8 X posts, scraped 2026-10-30)

Source: public X posts shared by Ever. Only links present in the posts (t.co expanded). Skills fetched into `skills/` (commit noted; each keeps its upstream LICENSE terms).

## 1. @hrstwt — https://x.com/hrstwt/status/2116101792564142542
"Nerds Thank me later" — UI component libraries.
- https://www.rareui.com/
- https://kobra.systems/components/input-otp
- https://easyui.site
- https://www.pinui.xyz/
- https://ui.aceternity.com
Takeaway: five free UI component galleries to pull pieces from. (Author replied to @Simplified_su: "Will include in next part".)

## 2. @Simplified_su — https://x.com/simplified_su/status/2116189497771876435
Reply to #1: "u missed" https://Amicro.dev
Takeaway: one more component library to add to #1's list.

## 3. @nickbakeddesign — https://x.com/nickbakeddesign/status/2116042686943969727
Thread root: "more html-in-canvas" (https://x.com/nickbakeddesign/status/2116042685043888269)
- Guide: https://baked.design/fun/html-in-canvas/
- Agent MD: https://baked.design/fun/html-in-canvas.md → saved `skills/baked-html-in-canvas.md`
- https://baked.design/lab/snowfall/
- https://baked.design/lab/wishing-pond/
- https://baked.design/lab/margin-dragon/ (concept inspired by @Riyvir)
Tool: Chrome's experimental HTML-in-Canvas API.
Takeaway: canvas effects (water, snow, dragon) drawn over live HTML, with an agent-ready .md to copy.

## 4. @sportskoat — https://x.com/sportskoat/status/2115913914945020109
Reply in thread by @magdiel_rb ("take the call, download the video, split the frames, send to the AI agent to see what was adjusted", quoting @jaimintf's "deslop any vibecoded app"). Post is an image only, no links.
Takeaway: workflow = record video → split frames → have an agent diff the design changes.

## 5. @thegreatest_sv — https://x.com/thegreatest_sv/status/2115876572464812071
"7 design repos you need to know":
1. UI UX Pro Max — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill → `skills/ui-ux-pro-max/`
2. Impeccable — https://github.com/pbakaus/impeccable → `skills/impeccable/`
3. Framelink Figma MCP — https://github.com/GLips/Figma-Context-MCP
4. React Bits — https://github.com/DavidHDev/react-bits
5. GSAP Skills — https://github.com/greensock/gsap-skills → `skills/gsap-*/`
6. HyperFrames — https://github.com/heygen-com/hyperframes
7. MCP for Blender — https://github.com/ahujasid/mcp-for-blender
Quoted: X article https://x.com/i/article/2080630536414920704. Author's replies only share images; the "exact prompt" is offered via comment/DM, not in the thread.
Takeaway: design taste skills + anti-slop critique + GSAP scroll animation skills are the core kit.

## 6. @jaimintf — https://x.com/jaimintf/status/2115866007868936600
Prompt: "use appllama mcp & skills, redesign the home screen referencing go club & suno."
- MCP: https://appllama.io
- Skills: https://github.com/Appllama/appllama-skills → `skills/appllama-*`, `skills/llms.txt`
Takeaway: point an agent at an MCP + skills and two reference apps to redesign a screen.

## 7. @niazmorshed_ — https://x.com/niazmorshed_/status/2116006291852423247
"Introducing /reanimate — Reverse engineer any animation from any website, video or gif." https://reanimate.niazmorshed.dev/
Takeaway: one command to clone an animation from a site/video/gif (useful for matching brytonzoz.com motion).

## 8. @heydamir — https://x.com/heydamir/status/2116158176336970008
"I turned my unslopping process into a free Claude skill" (landing pages, dashboards, mobile apps).
- https://github.com/heydamir/unslop → `skills/unslop-heydamir/`
- Hire page (self-reply): https://heydamir.design/unslop
- Quoted demo: https://x.com/heydamir/status/2115063463063998736
Takeaway: a skill that critiques and fixes generic AI-looking UI.

## 9. @BardhylBytyqi — https://x.com/BardhylBytyqi/status/2116289761400819905
"If you use AI, this is it" (author builds @modulify; post has a 12s demo video, no thread or quotes).
1. Modulify — https://modulify.ai/ — AI website/web-app builder (layouts, copy, CMS, DB, hosting); pitched as "Lovable 60% cheaper".
2. Motion — https://motionin.design/ — premium physics-based, cursor-responsive web sections, each with a copy-paste AI prompt.
3. Landdding — https://landdding.com/ — daily community-upvoted landing page design inspiration.
4. Wonderlist — https://wonderlist.design/ — 127 premium Figma website templates (SaaS, agency, portfolio).
5. Iconly — https://iconly.design/ — curated library of 2,400+ app, game and web icons, filterable by style/color.
Takeaway: Motion's prompt-per-section library is the most useful for scroll/motion cues; Landdding + Iconly for inspiration.

## Fetched skills (commit)
- heydamir/unslop @4652254
- pbakaus/impeccable @df3a4ab
- nextlevelbuilder/ui-ux-pro-max-skill @9a3f14f (ui-ux-pro-max only)
- greensock/gsap-skills @aed9cfd (8 skills)
- Appllama/appllama-skills @dd5caae (2 skills)
- baked.design html-in-canvas.md
