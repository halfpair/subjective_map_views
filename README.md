# General

_Subjective Map Views_ is a small, self-contained, interactive web-tool to play around with different 2D projections and views of earth maps.

# Purpose

There are a lot of 2D views of earth maps out there as icons, cliparts, art, diagrams, and any kind of visual communication. All these pictures show a certain view to our planet. And as such 2D projections of a spherical object always have some distortions, they shape how we see the distribution, size, and shape of continents and countries. To question or extend these views and to get an idea about less obvious relations, this project should provide an interactive tool for.

# Usage

The main tool is a small self-contained HTML5 web page in folder `webpage`. Because it uses HTTPRequests, it must run on a server and it **isn't** sufficient to load the `index.html` file in a browser.

## Online

The most recent tag of this project is hosted on https://www.signodes.de/subjective_web_views/ and can be used there from any web browser.

## Local

You can run a local web server on the `webpage` folder of this project on your machine.

If you have installed the Python programming language on your machine, you can start a command line, switch to the `webpage` folder of the download of this project and run

```
python3 -m http.server 3000
```

Afterwards you can reach the tool on http://localhost:3000 on your machine from any web browser.

# Content

This project contains this folder structure:

* `tools`: Some helper scripts to generate data for the web tool. This folder is not needed to use the web tool.
* `webpage`: The HTML5 web tool itself with all it's data. When this folder is hosted on a (local) server, it can be used from any web browser.
  * `data`: The non-code content, images, and vector data for the HTML5 web tool.

# License

All source code of this project in `tools` and `webpage` is available under the [MIT License](webpage/LICENSE.txt).

All vector data and images of this project in `webpage/data` is [public domain](webpage/data/LICENSE.txt) as the sources are provided by [Natural Earth](https://www.naturalearthdata.com/) and [NASA](https://visibleearth.nasa.gov) in the public domain, too.

# Disclaimer

It's possible to show country's frontiers by this tool. It's known, that frontiers are often a source of political conflicts or their exact position is hard to draw on such a scale. So the country's frontiers provided by this tool should be used for rough orientation and not to discriminate against anybody.