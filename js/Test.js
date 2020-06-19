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

/**
 * Base class for tests.
 *
 * Tests are run in an OfflineAudioContext and the duration is measured.
 */
class Test {
  /**
   * @param {string} name The name of the test.
   * @param {number} numNodes Number of nodes used in the test. The test duration will be divided by this number to give the duration per node. Choose a number which makes your test take > 500 ms to run.
   * @param {number} [durationFactor=1] For slow tests, you can set a value less than 1 to shorten the render duration.
   */
  constructor(name, numNodes, durationFactor) {
    this.name = name;
    this.numNodes = numNodes;
    this.durationFactor = durationFactor || 1.0;
  }

  /**
   * Builds the audio graph. Override in subclasses.
   *
   * @param ctx {OfflineAudioContext} The OfflineAudioContext.
   * @param last {AudioNode} The OscillatorNode, which is the last node in the graph, so far.
   * @returns {AudioNode} The resulting last AudioNode of the graph, which will be connected to ctx.destination.
   */
  buildGraph(ctx, last) {
    // default is pass through
    return last;
  }

  /**
   * Runs the test.
   *
   * @param duration {Number} number of seconds to render audio.
   * @returns {Promise<Number>} the duration of the test in seconds.
   */
  run(duration) {
    return new Promise((resolve, reject) => {
      const sampleRate = 44100;
      const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, sampleRate * duration, sampleRate);

      try {
        // we use an AudioBufferSourceNode as baseline.
        // We set playbackRate to something other than 1 so the node needs to do a bit of work.
        // This gives more stable results than having playbackRate of 1.
        const source = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
        const chan = buffer.getChannelData(0);
        for(let i = 0; i < chan.length; i++) {
          chan[i] = Math.sin(Math.PI * 2 * i * 440 / 44100);
        }
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = 1;
        source.playbackRate.value = 0.9;
        source.start(0);

        let last = this.buildGraph(ctx, source);

        last.connect(ctx.destination);
      } catch(e) {
        reject(e);
        return;
      }

      let startTime;
      // cooling period
      setTimeout(() => {
        startTime = window.performance.now();
        ctx.startRendering();
      }, 10);

      ctx.oncomplete = (event) => {
        const endTime = event.timeStamp;
        const duration = (endTime - startTime) / 1000;
        resolve(duration);
      };
    });
  }
}

class BiquadFilterTest extends Test {
  constructor(value) {
    super('Biquad-' + value, 7);
    this.value = value;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createBiquadFilter();
      if (this.value === 'default') {
        // nothing
      } else {
        node.frequency.value = this.value;
      }
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class BiquadFilterAutomationTest extends Test {
  constructor(rampType, automationRate) {
    super('BiquadAutomation-' + rampType + '-' + automationRate, 3);
    this.rampType = rampType;
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    const curve = new Float32Array([1.1, 1.2, 1.3, 1.6, 2.0]);
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createBiquadFilter();
      node.Q.setValueAtTime(1, 0);
      if (this.rampType === 'exp') {
        node.Q.exponentialRampToValueAtTime(800, 1000);
        node.Q.exponentialRampToValueAtTime(1, 1001);
        node.Q.exponentialRampToValueAtTime(800, 1002);
      } else if (this.rampType === 'linear') {
        node.Q.linearRampToValueAtTime(800, 1000);
        node.Q.linearRampToValueAtTime(1, 1001);
        node.Q.linearRampToValueAtTime(800, 1002);
      } else if (this.rampType === 'target') {
        node.Q.setTargetAtTime(800, 0.1, 1000);
        node.Q.setTargetAtTime(1, 1000, 1000);
        node.Q.setTargetAtTime(800, 1001, 1000);
      } else if (this.rampType === 'curve') {
        node.Q.setValueCurveAtTime(curve, 0.1, 1000);
        node.Q.setValueCurveAtTime(curve, 1001, 1);
        node.Q.setValueCurveAtTime(curve, 1003, 1);
      } else {
        throw new Error('Bad rampType: ' + this.rampType);
      }
      node.frequency.automationRate = this.automationRate;
      node.gain.automationRate = this.automationRate;
      node.Q.automationRate = this.automationRate;
      node.detune.automationRate = this.automationRate;
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class ConvolverTest extends Test {
  constructor(length, nameSuffix, numNodes, durationFactor) {
    super('Convolver-' + nameSuffix, numNodes, durationFactor);
    this.length = length;
  }

  buildGraph(ctx, last) {
    const buffer = ctx.createBuffer(1, this.length, ctx.sampleRate);

    // make sure it is not all zeros or Firefox will optimise away fft
    const chan = buffer.getChannelData(0);
    for(let i = 0; i < chan.length; i++) {
      chan[i] = Math.sin(Math.PI * 2 * i * 440 / 44100);
    }

    for(let i = 0; i < this.numNodes; i++) {
      const node = ctx.createConvolver();
      node.buffer = buffer;
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class WaveShaperTest extends Test {
  constructor(oversample, nameSuffix, numNodes) {
    super('WaveShaper-' + nameSuffix, numNodes);
    this.oversample = oversample;
  }

  buildGraph(ctx, last) {
    // basic curve data will do
    const curve = new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);

    for(let i = 0; i < this.numNodes; i++) {
      const node = ctx.createWaveShaper();
      node.oversample = this.oversample;
      node.curve = curve;
      last.connect(node);
      last = node;
    }

    return last;
  }
}

class GainTest extends Test {
  constructor(gain, automationRate, nameSuffix) {
    super('Gain-' + nameSuffix, 30);
    this.gain = gain;
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createGain();
      if (this.gain !== 'default') {
        node.gain.value = this.gain;
      }
      if (this.automationRate !== '') {
        node.gain.automationRate = this.automationRate;
      }
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class GainCancelTest extends Test {
  constructor(gain, automationRate, nameSuffix) {
    super('GainCancel-' + nameSuffix, 30);
    this.gain = gain;
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createGain();
      if (this.gain !== 'default') {
        node.gain.value = this.gain;
        node.gain.cancelScheduledValues(0.001);
      }
      if (this.automationRate !== '') {
        node.gain.automationRate = this.automationRate;
      }
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class GainAutomationTest extends Test {
  constructor(rampType, automationRate) {
    super('GainAutomation-' + rampType + '-' + automationRate, 12);
    this.rampType = rampType;
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    const curve = new Float32Array([1.1, 1.2, 1.3, 1.6, 2.0]);
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createGain();
      node.gain.automationRate = this.automationRate;
      node.gain.setValueAtTime(1.01, 0);
      if (this.rampType === 'exp') {
        node.gain.exponentialRampToValueAtTime(800, 1000);
        node.gain.exponentialRampToValueAtTime(1, 1001);
        node.gain.exponentialRampToValueAtTime(800, 1002);
      } else if (this.rampType === 'linear') {
        node.gain.linearRampToValueAtTime(800, 1000);
        node.gain.linearRampToValueAtTime(1, 1001);
        node.gain.linearRampToValueAtTime(800, 1002);
      } else if (this.rampType === 'target') {
        node.gain.setTargetAtTime(800, 0.1, 1000);
        node.gain.setTargetAtTime(1, 1000, 1000);
        node.gain.setTargetAtTime(800, 1001, 1000);
      } else if (this.rampType === 'curve') {
        node.gain.setValueCurveAtTime(curve, 0.1, 1000);
        node.gain.setValueCurveAtTime(curve, 1001, 1);
        node.gain.setValueCurveAtTime(curve, 1003, 1);
      } else {
        throw new Error('Bad rampType: ' + this.rampType);
      }
      node.gain.automationRate = this.automationRate;
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class GainAutomationConnTest extends Test {
  constructor(automationRate) {
    super('GainAutomationConn-' + automationRate, 12);
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    const source = last;
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createGain();
      node.gain.automationRate = this.automationRate;
      source.connect(node.gain);
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class CompressorTest extends Test {
  constructor(knee) {
    super('Compressor-knee-' + knee, 1);
    this.knee = knee;
  }

  buildGraph(ctx, last) {
    const node = ctx.createDynamicsCompressor();
    node.knee.value = this.knee;
    last.connect(node);
    last = node;
    return last;
  }
}

class OscillatorTest extends Test {
  constructor() {
    super('Oscillator', 3);
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createOscillator();
      node.start(0);
      node.connect(ctx.destination);
    }
    return last;
  }
}

class OscillatorAutomationTest extends Test {
  constructor(rampType, automationRate) {
    super('Oscillator.frequency-' + rampType + '-' + automationRate, 3);
    this.rampType = rampType;
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createOscillator();
      node.frequency.automationRate = this.automationRate;
      node.frequency.setValueAtTime(100, 0);
      if (this.rampType = "linear") {
          node.frequency.linearRampToValueAtTime(4000, 1000);
      } else {
        throw new Error('Bad rampType: ' + this.rampType);
      }
      node.start(0);
      node.connect(ctx.destination);
    }
    return last;
  }
}

class AudioBufferSourceTest extends Test {
  constructor(rate, numNodes) {
    super('AudioBufferSource-rate' + rate, numNodes);
    this.rate = rate;
  }

  buildGraph(ctx, last) {
    const bufferLength = ctx.sampleRate;
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);

      // make sure it is not all zeros or Firefox will optimise away fft
      const chan = buffer.getChannelData(0);
      for(let i = 0; i < chan.length; i++) {
        chan[i] = Math.sin(Math.PI * 2 * i * 440 / 44100);
      }

      node.buffer = buffer;
      node.loopStart = 0;
      node.loopEnd = 1;
      node.loop = true;
      if (this.rate !== 1) {
        node.playbackRate.value = this.rate;
      }
      node.start(0);
      node.connect(ctx.destination);
    }
    return last;
  }
}

class DelayTest extends Test {
  constructor(delay) {
    super('Delay-' + delay, 2);
    this.delay = delay;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createDelay(0.2);
      if (this.delay === 'default') {
        // use defaults
      } else {
        node.delayTime.value = this.delay;
      }
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class DelayAutomationTest extends Test {
  constructor(automationRate) {
    super('DelayAutomation-' + automationRate, 2);
    this.automationRate = automationRate;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createDelay(0.2);
      node.delayTime.setValueAtTime(0, 0);
      node.delayTime.setValueAtTime(0.1, 1000);
      node.delayTime.automationRate = this.automationRate;
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class ChannelSplitterTest extends Test {
  constructor() {
    super('ChannelSplitter', 30);
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createChannelSplitter(2);
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class ChannelMergerTest extends Test {
  constructor() {
    super('ChannelMerger', 30);
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createChannelMerger(2);
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class AnalyserTest extends Test {
  constructor() {
    super('Analyser', 30);
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createAnalyser();
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class PannerTest extends Test {
  constructor(panningModel, numNodes) {
    super('Panner-' + panningModel, numNodes);
    this.panningModel = panningModel;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createPanner();
      // setPosition is deprecated but supported by all browsers, .positionX isn't
      node.setPosition(1, 1, 1);
      node.panningModel = this.panningModel;
      last.connect(node);
      last = node;
    }
    return last;
  }
}

class StereoPannerTest extends Test {
  constructor(pan) {
    super('StereoPanner-' + pan, 20);
    this.pan = pan;
  }

  buildGraph(ctx, last) {
    for (let i = 0; i < this.numNodes; i++) {
      const node = ctx.createStereoPanner();
      // always treat input as mono
      node.channelCount = 1;
      node.channelCountMode = 'explicit';
      if (this.pan === 'default') {
        // default
      } else {
        node.pan.value = this.pan;
      }
      last.connect(node);
      last = node;
    }
    return last;
  }
}
