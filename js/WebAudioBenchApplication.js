/*
 * Copyright (c) 2019-Present, Spotify AB.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

class WebAudioBenchApplication {
  constructor() {
    this.testsSelection = document.querySelector('.tests-selection select');
    const tests = this.getTestList();

    const urlParams = new URLSearchParams(window.location.search);

    // Expression for matching test names that we want to
    // select for testing.  Use something like
    // "localhost/?pattern=Oscillator" if you want to select all
    // Oscillator tests.
    let testPattern;
    if (urlParams.has('pattern')) {
	testPattern = urlParams.get('pattern');
    }

    tests.forEach((test) => {
      const option = document.createElement('option');
      option.value = test.name;
      option.innerText = test.name;
      if (testPattern) {
	  option.selected = option.value.indexOf(testPattern) !== -1;
      } else {
	  option.selected = true;
      }
      this.testsSelection.appendChild(option);
    });

    const runsInputElement = document.querySelector('.run-settings .runs input');
    const durationInputElement = document.querySelector('.run-settings .duration input');
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1) {
      // Safari.
      // 1ms resolution forces us to run longer tests, giving lower precision.
      // See https://github.com/w3c/hr-time/issues/56
      runsInputElement.value = 50;
      durationInputElement.value = 200;
    } else {
      // Other browsers.
      runsInputElement.value = 500;
      durationInputElement.value = 20;
    }

    // Update the runs and duration from the URL, if given
    if (urlParams.has('runs')) {
      runsInputElement.value = urlParams.get('runs');
    }
    if (urlParams.has('sec')) {
      durationInputElement.value = urlParams.get('sec');
    }
    // Verbosity level of console logs.  Higher means more logs. 0
    // means the least.
    if (urlParams.has('verbosity')) {
      this.verbosity = urlParams.get('verbosity');
    } else {
      this.verbosity = 99;
    }

    this.resultsTable = document.querySelector('.results-table');
    this.runButton = document.querySelector('.run-button');
    this.runButton.addEventListener('mousedown', () => {
      const testRuns = parseInt(runsInputElement.value);
      if (Number.isNaN(testRuns) || testRuns < 1) {
        alert("The number of test runs is invalid.");
        return;
      }

      const defaultRenderDuration = parseInt(durationInputElement.value);
      if (Number.isNaN(defaultRenderDuration) || defaultRenderDuration < 1) {
        alert("The duration is invalid.");
        return;
      }

      const testNames = [];
      for(let i = 0; i < this.testsSelection.options.length; i++) {
        const option = this.testsSelection.options[i];
        if (option.selected) {
          testNames.push(option.value);
        }
      }

      if(testNames.length === 0) {
        alert("Please select one or more tests.");
        return;
      }

      this.runButton.disabled = true;

      this.resultsTable.querySelectorAll('tr:not(.header)').forEach(elem => elem.remove());
      this.testResults = {};


      const origText = this.runButton.innerText;
      this.runButton.innerText = '...';
      this.runTests(testNames, testRuns, defaultRenderDuration).finally(() => {
        this.runButton.innerText = origText;
        this.runButton.disabled = false;
      });
    });
  }

  getTestList() {
    return [
      new BiquadFilterTest('default'),
      new BiquadFilterTest(440),
      new AudioBufferSourceTest(1.0, true, 20),
      new AudioBufferSourceTest(0.9, true, 8),
      new AudioBufferSourceTest(1.0, false, 20),
      new AudioBufferSourceTest(0.9, false, 8),
      new OscillatorTest(),
      new OscillatorAutomationTest('linear', 'a-rate'),
      new OscillatorAutomationTest('linear', 'k-rate'),
      new GainTest('default', '', 'default'),
      new GainTest(1.0, '', '1.0'),
      new GainTest(0.9, '', '0.9'),
      new GainTest(0.9, 'k-rate', '0.9-k-rate'),
      new GainCancelTest(1.0, '', '1.0'),
      new GainCancelTest(0.9, '', '0.9'),
      new GainCancelTest(0.9, 'k-rate', '0.9-k-rate'),
      new GainAutomationTest('exp', 'a-rate'),
      new GainAutomationTest('linear', 'a-rate'),
      new GainAutomationTest('target', 'a-rate'),
      new GainAutomationTest('curve', 'a-rate'),
      new GainAutomationTest('exp', 'k-rate'),
      new GainAutomationTest('linear', 'k-rate'),
      new GainAutomationTest('target', 'k-rate'),
      new GainAutomationTest('curve', 'k-rate'),
      new GainAutomationConnTest('a-rate'),
      new GainAutomationConnTest('k-rate'),
      new BiquadFilterAutomationTest('exp', 'a-rate'),
      new BiquadFilterAutomationTest('linear', 'a-rate'),
      new BiquadFilterAutomationTest('target', 'a-rate'),
      new BiquadFilterAutomationTest('curve', 'a-rate'),
      new BiquadFilterAutomationTest('exp', 'k-rate'),
      new BiquadFilterAutomationTest('linear', 'k-rate'),
      new BiquadFilterAutomationTest('target', 'k-rate'),
      new BiquadFilterAutomationTest('curve', 'k-rate'),
      new DelayTest('default'),
      new DelayTest(0.1),
      new DelayAutomationTest('a-rate'),
      new DelayAutomationTest('k-rate'),
      new ChannelSplitterTest(),
      new ChannelMergerTest(),
      new AnalyserTest(),
      new WaveShaperTest('none', '1x', 6),
      new WaveShaperTest('2x', '2x', 2),
      new WaveShaperTest('4x', '4x', 1),
      new CompressorTest(0),
      new CompressorTest(40),
      new ConvolverTest(128, '128f-3ms', 3, 1),
      new ConvolverTest(1024, '1024f-23ms', 1, 1),
      new ConvolverTest(2048, '2048f-46ms', 1, 1),
      new ConvolverTest(32768, '32768f-743ms', 1, 0.6),
      new PannerTest('equalpower', 5),
      new PannerTest('HRTF', 1),
      new StereoPannerTest('default'),
      new StereoPannerTest(0),
      new StereoPannerTest(0.2),
      new StereoPannerTest(1.0),
    ];
  }

  runTests(testNames, testRuns, defaultRenderDuration) {
    const tests = this.getTestList();
    const baselineTest = new Test('Baseline', 1, 4);
    let baseline = 0;
    let chain = this.runTest(baselineTest, testRuns, defaultRenderDuration).then((durations) => {
      baseline = Math.min(...durations);
      this.storeResult(baselineTest.name, durations);
    });

    tests.filter((test) => testNames.indexOf(test.name) !== -1).forEach((test) => {
      chain = chain.then(() => {
        return this.runTest(test, testRuns, defaultRenderDuration).then((durations) => {
          durations = durations.map((d) => (d - baseline) / test.numNodes);
          this.storeResult(test.name, durations);
        }, (error) => {
          this.storeError(test.name, error);
        });
      });
    });

    chain = chain.then(() => {
      const benchmark = new MixedBenchmark(this.testResults);
      const score = benchmark.calculate();
      this.outputResult(benchmark.name, score, score, score, score, score, false);
    });
    return chain;
  }

  runTest(test, numRuns, defaultRenderSeconds) {
    const renderSeconds = defaultRenderSeconds * test.durationFactor;
    const durations = [];
    let chain = undefined;
    console.log('Running ' + test.name);
    for(let i = 0; i < numRuns; i++) {
      if (chain === undefined) {
        chain = test.run(renderSeconds);
      } else {
        chain = chain.then((_) => test.run(renderSeconds));
      }
      chain = chain.then((duration) => {
        if (this.verbosity >= 99) {
          console.log('took ' + Math.round(duration * 1000) + ' ms');
	}
        duration /= renderSeconds;
        durations.push(duration);
        return durations;
      });
    }
    return chain;
  }

  storeError(name, error) {
    console.warn(name + ' returned error: ', error);

    this.outputResult(name, 0, 0, 0, 0, 0, false);
  }

  storeResult(name, durations) {
    let mean = 0;
    let stddev = 0;

    for (let k = 0; k < durations.length; ++k) {
	mean += durations[k];
    }
    mean = mean / durations.length;

    for (let k = 0; k < durations.length; ++k) {
      let diff = durations[k] - mean;
      stddev += diff * diff;
    }
    stddev = Math.sqrt(stddev / (durations.length - 1));

    durations = durations.map((d) => Math.round(d * 1000 * 1000));
    durations.sort((a, b) => a - b);

    const min = durations[0];
    const q1 = durations[Math.floor(durations.length * 0.25)];
    const median = durations[Math.floor(durations.length / 2)];
    const q3 = durations[Math.floor(durations.length * 0.75)];
    const max = durations[durations.length - 1];

    console.log('Test ' + name);
    console.log(`Stats: (${min},${min},${q1},${median},${q3},${max},${1e6 * mean},${1e6 * stddev})`);
    console.log('min ' + min + ' (' + durations + ')');
    console.log('mean = ', mean);
    console.log('stddev = ', stddev);

    this.testResults[name] = min;

    const showDetails = durations.length >= 5;
    this.outputResult(name, min, q1, median, q3, max, mean, stddev, showDetails);
  }

  outputResult(name, min, q1, median, q3, max, mean, stddev, showDetails) {
    const cells = [name, "" + Math.round(min)];
    if (showDetails) {
	[min, q1, median, q3, max].map(v => "" + Math.round(v)).forEach(v => cells.push(v));
	[mean, stddev].map(v => "" + Math.round(v*1000*1000*100)/100).forEach(v => cells.push(v));
    }
    this.outputRow(cells);
  }

  outputRow(cells) {
    const tr = document.createElement('tr');

    cells.forEach((v => {
      const td = document.createElement('td');
      td.innerText = v;
      tr.appendChild(td);
    }));

    this.resultsTable.appendChild(tr);
  }
}
