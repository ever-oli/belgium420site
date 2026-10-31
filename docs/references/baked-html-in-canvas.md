# How to put a web page under water

> How we made the Wishing Pond and Margin Dragon with Chrome's HTML-in-Canvas: five live demos you can play with, and the code to copy.

An interactive guide on https://baked.design/fun/html-in-canvas/. It explains how the Wishing Pond (https://baked.design/lab/wishing-pond/), Snowfall (https://baked.design/lab/snowfall/) and Margin Dragon (https://baked.design/lab/margin-dragon/) were built with Chrome's experimental HTML-in-Canvas API, which lets a canvas draw real, live HTML.

## The steps

1. Put the page inside a canvas: mark the canvas with layoutsubtree (and content="drawable"), put the HTML inside it, and draw it in the canvas's paint event with drawElementImage. The demo draws a form and its reflection, and the reflection updates as you type.
2. Bend the pixels: copy the canvas into a WebGL texture and read each pixel from a slightly wavy spot in a shader. A slider sets the wobble. The form still works.
3. Make it react: a grid of water heights under the page, disturbed by the pointer, spreads waves; the slope of the water bends the page. The Toss a coin button still works under the water.
4. Let the words make way: the Margin Dragon is a chain of circles along its spine. Every frame, each line of text works out which parts the circles leave free and fills them with as many words as fit; the rest pours on into the next line. This step needs no canvas API.
5. Burn the page: a grid of how burnt each spot is sits under the page. A click lights a spot, and a glowing edge creeps outward until it cools. In the shader, the burn value browns the paper, chars it, rims it with embers and burns through. The page mends after a while, and the form still works.
6. Ship it to everyone: register the site on Chrome Origin Trials (https://developer.chrome.com/origintrials/), add the token as a meta tag or Origin-Trial header, check for drawElementImage, and show the plain page where it is missing (Safari, Firefox, phones).

## Questions

- Clicks and typing keep working: the browser maps them from the drawing back to the real HTML.
- Desktop Chrome only for now; record a video for social.
- Screen readers and keyboards use the real HTML. Respect reduced motion.
- The trial ends March 1, 2027.

## More
- Everything on /fun: https://baked.design/fun/
- Home: https://baked.design/
