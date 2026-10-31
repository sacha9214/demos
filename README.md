# Demo websites for local businesses

Portfolio demos by [Sacha](https://github.com/sacha9214): one site per type of French local business, each with its own design. **All businesses are fictional**, photos come from Unsplash, and every page is marked `noindex`.

**Open them:** https://sacha9214.github.io/demos/

| Demo | Business | Highlights |
|---|---|---|
| [restaurant/](https://sacha9214.github.io/demos/restaurant/) | Le Comptoir des Halles, bistrot in Nantes | Printed-menu style carte, ardoise du jour, wine list, table booking |
| [boulangerie/](https://sacha9214.github.io/demos/boulangerie/) | Maison Fournier, bakery in Lyon | Product tabs with prices, click & collect with live total |
| [tatouage/](https://sacha9214.github.io/demos/tatouage/) | Encre Noire, tattoo studio in Bordeaux | Filterable portfolio and lightbox, artists, project request |
| [garage/](https://sacha9214.github.io/demos/garage/) | Garage Lefèvre, Rennes | Price board, appointment form with number-plate field |
| [fleuriste/](https://sacha9214.github.io/demos/fleuriste/) | Pétale & Tige, florist in Lille | Bouquets with sizes, delivery order with live total |
| [osteopathe/](https://sacha9214.github.io/demos/osteopathe/) | Camille Aubert, osteopath in Montpellier | Session walkthrough, prices, slot-picker booking |
| [photographe/](https://sacha9214.github.io/demos/photographe/) | Clara Vidal, photographer in Annecy | Full-screen portfolio with filter, packages, enquiry form |
| [artisan-demo](https://sacha9214.github.io/artisan-demo/) | Morel Finitions, builder near Tours | Separate repo, with an owner CMS |

## How they're built

- Each demo is plain HTML, CSS and a little JavaScript, with no framework and no build step.
- **Fonts are self-hosted**: no Google Fonts or CDN, so no third-party requests other than the photos.
- Every demo has:
  - a mobile menu and a sticky call bar on phones;
  - accessible forms with French validation messages;
  - schema.org data with no self-published ratings.
- **Forms are demo-only**: they validate and show a summary, but never send anything.

Fonts are under the SIL Open Font License, via [Fontsource](https://fontsource.org). Photos are under the [Unsplash License](https://unsplash.com/license).
