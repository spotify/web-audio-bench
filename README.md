# Web Audio Bench

[![lifecycle](https://img.shields.io/badge/lifecycle-alpha-blue.svg)](https://img.shields.io/badge/lifecycle-alpha-blue.svg)
[![License](https://img.shields.io/github/license/spotify/apollo.svg)](LICENSE.txt)

Web Audio Bench is a test suite for comparing web audio performance across devices and browsers. It is written in Javascript.

## Example

The example below compares different browsers on Mac. Lower values are better. It shows:

* The performance is similar across browsers for AudioBufferSourceNode and OscillatorNode.
* There are big variations in GainNode and BiquadFilterNode automation performance. 
* The most expensive node types are CompressorNode and the nodes involving FFT; WaveShaperNode, ConvolverNode and PannerNode, with variations across browsers.
* Safari has the fastest baseline and most nodes are a bit faster. This could indicate faster framework, such as a more efficient audio graph traversal / audio data propagation.
* The MixedBenchmark metric is a compound score using a handful of the most commonly used nodes. It can be used as an overall score for a given platform and browser.

![Example Graph](doc/mac_graph.png)

## About

The primary goal of Web Audio Bench is to provide a benchmark of overall CPU performance for Web Audio as well as individual performance figures for different AudioNodes. The results can be used to e.g.

* Compare the performance of different browsers on the same hardware
* Compare the performance on different hardware for the same browser
* Compare different browser versions

It can be used to identify regressions as well as optimisation opportunities. It can also be used to customize web audio usage for best performance per platform.

The second goal is to allow Web Audio developers to write custom tests to compare the relative performance of different graph layouts. For this, you'll need to fork this project and add your own
custom test implementations.

* [More examples](doc/Example.md)
* [Source code for tests](js/Test.js)

# Running

To run the benchmark, you can either visit the GitHub project page (above) or clone this repo and open index.html in your browser.

Alternatively, use an http server, e.g.:

    npm install http-server -g
    http-server -p 7777 -c-1
    
Then, open http://localhost:7777

### Safari note

2019-09-11: A memory leak in Safari makes the browser tab crash after 50 test runs or so. To avoid it, reduce number of test runs to 1. If this doesn't help, reduce the test duration to 100 seconds or
even lower, see `DEFAULT_RENDER_SECONDS` in `WebAudioBenchApplication.js`.

# Developing

All tests inherit the `Test` base class. For a simple example, look at the `CompressorTest`. You can add constructor arguments to customize the kind of test to be run. In the `CompressorTest`
example, we can provide different `knee`-values and see how this affects performance.

After having written your test, add it to the list of tests in `WebAudioBenchApplication.getTestList()`.

In order to get fast test runs while not measuring too short time periods, all tests have been tuned to take approximately 500 ms on a MacBook Pro 2017 (3,1 GHz Intel Core i7) when running in Chrome 78. When adding your
own tests, try to make them run roughly as long. You can tune the test duration by setting `numNodes` in the `Test` constructor, which will indicate how many
nodes you intend to test on in parallel. The total duration of your test will then be divided by this number. You can also tune the test duration by reducing the length of the test audio signal, see
`DEFAULT_RENDER_SECONDS`.

## Contributing

Contributions such as bug fixes, improvements and new tests are welcome. Please submit a pull request or issue.

## Development Status

This product is considered alpha.

## Code of Conduct

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.

[code-of-conduct]: https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md
