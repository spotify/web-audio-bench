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

const DEFAULT_RENDER_SECONDS = 300;

class WebAudioBenchApplication {
  constructor() {
    this.testNames = document.querySelector('.test-names');
    this.benchmarkScore = document.querySelector('.benchmark-score');

    this.runButton = document.querySelector('.run-button');
    this.runButton.addEventListener('mousedown', () => {
      this.testRuns = parseInt(document.querySelector('.run-settings .runs input').value);
      if (Number.isNaN(this.testRuns) || this.testRuns < 1 || this.testRuns > 1000) {
        alert("The number of test runs is invalid.");
        return;
      }

      this.runButton.disabled = true;

      this.testNames.innerHTML = '';
      const nameHeadline = document.createElement('div');
      nameHeadline.innerText = 'TEST';
      this.testNames.appendChild(nameHeadline);

      this.testDurations = document.createElement('div');
      this.testDurations.setAttribute('contenteditable', 'true');
      this.testDurations.classList.add('test-durations');

      this.benchmarkScore.innerText = '';

      document.querySelector('.benchmark-results').appendChild(this.testDurations);
      const headline = document.createElement('div');
      headline.innerText = 'MICROSECONDS';
      this.testDurations.appendChild(headline);

      this.testResults = {};

      const origText = this.runButton.innerText;
      this.runButton.innerText = '...';
      this.runTests().then(() => {
        this.runButton.innerText = origText;
        this.runButton.disabled = false;
      });
    });
  }

  getTestList() {
    return [
      new BiquadFilterTest('default'),
      new BiquadFilterTest(440),
      new AudioBufferSourceTest(1.0, 20),
      new AudioBufferSourceTest(0.9, 8),
      new OscillatorTest(),
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

  runTests() {
    const baselineRuns = this.testRuns * 2;
    const tests = this.getTestList();
    const baselineTest = new Test('Baseline', 1);
    let baseline = 0;
    let chain = this.runTest(baselineTest, baselineRuns).then((durations) => {
      baseline = Math.min(...durations);
      this.storeResult(baselineTest.name, durations);
    });

    tests.forEach((test) => {
      chain = chain.then(() => {
        return this.runTest(test, this.testRuns).then((durations) => {
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
      this.benchmarkScore.innerHTML = benchmark.name + ': ' + Math.round(score) + ' microseconds';
    });
    return chain;
  }

  runTest(test, numRuns) {
    const renderSeconds = DEFAULT_RENDER_SECONDS * test.durationFactor;
    const durations = [];
    let chain;
    console.log('Running ' + test.name);
    for(let i = 0; i < numRuns; i++) {
      if (chain === undefined) {
        chain = test.run(renderSeconds);
      } else {
        chain = chain.then((_) => test.run(renderSeconds));
      }
      chain = chain.then((duration) => {
        console.log('took ' + Math.round(duration * 1000) + ' ms');
        duration /= renderSeconds;
        durations.push(duration);
        return durations;
      });
    }
    return chain;
  }

  storeError(name, error) {
    console.warn(name + ' returned error: ', error);

    this.outputResult(name, '-');
  }

  storeResult(name, durations) {
    durations = durations.map((d) => Math.round(d * 1000 * 1000));
    durations.sort((a, b) => a - b);

    // TODO: Is this the most scientifically correct way to do it?
    // We don't pick the mean because sometimes there are extreme delay (outlier values).
    // We pick the median to filter out outlier values.
    const medianDuration = durations[Math.floor(durations.length / 2)];

    console.log('median ' + medianDuration + ' (' + durations + ')');

    this.testResults[name] = medianDuration;

    this.outputResult(name, "" + Math.round(medianDuration));
  }

  outputResult(name, duration) {
    const nameElem = document.createElement('div');
    nameElem.innerText = name;
    this.testNames.appendChild(nameElem);

    let elem = document.createElement('div');
    elem.innerText = duration;
    this.testDurations.appendChild(elem);
  }
}
