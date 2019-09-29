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

class Benchmark {
  /**
   * @param name The benchmark name.
   * @param testResults a map from test name to score from the individual tests.
   */
  constructor(name, testResults) {
    this.name = name;
    this.testResults = testResults;
  }

  /**
   * Calculates the score for a test given a multiplier.
   * @param name The test name.
   * @param multiplier The multiplier.
   * @returns {number}
   */
  calcScore(name, multiplier) {
    if (this.testResults[name] === undefined) {
      throw new Error('No such test name: ' + name);
    }
    return this.testResults[name] * multiplier;
  }

  /**
   * Calculates the benchmark score based on individual test results.
   * @returns {number} The benchmark score. Lower is better.
   */
  calculate() {
    return 0;
  }
}

class MixedBenchmark extends Benchmark{
  constructor(testResults) {
    super('MixedBenchmark', testResults);
  }

  calculate() {
    // We include the most commonly used node types.
    // The number of nodes per type is chosen in attempt to give each node type equal
    // influence on the total score, given the node type's "expected" computational cost.
    // This was chosen such that each group costs around 2000ms on Chrome 78 for a MacBook 2017 3.1GHz.

    let score = 0;
    let groups = 0;

    // GainNode group
    // 20 gain nodes
    score += this.calcScore('Gain-default', 20);
    // 10 gain nodes with non-default value
    score += this.calcScore('Gain-0.9', 10);
    // 8 gain nodes with automation
    score += this.calcScore('GainAutomation-exp-a-rate', 2);
    score += this.calcScore('GainAutomation-linear-a-rate', 2);
    score += this.calcScore('GainAutomation-target-a-rate', 2);
    score += this.calcScore('GainAutomation-curve-a-rate', 2);
    groups ++;

    // BiquadFilterNode group
    // 5 biquads
    score += this.calcScore('Biquad-default', 5);
    // 4 biquads with automation
    score += this.calcScore('BiquadAutomation-exp-a-rate', 1);
    score += this.calcScore('BiquadAutomation-linear-a-rate', 1);
    score += this.calcScore('BiquadAutomation-target-a-rate', 1);
    score += this.calcScore('BiquadAutomation-curve-a-rate', 1);
    groups ++;

    // DelayNode group
    // 3 delays
    score += this.calcScore('Delay-0.1', 3);
    groups ++;

    // WaveShaperNode group
    // 10 wave shapers
    score += this.calcScore('WaveShaper-1x', 10);
    groups ++;

    // OscillatorNode group
    // 5 oscillators
    score += this.calcScore('Oscillator', 5);
    groups ++;

    // AudioBufferSourceNode group
    // 20 absn rate 1
    score += this.calcScore('AudioBufferSource-rate1', 20);
    // 5 absn rate 0.9
    score += this.calcScore('AudioBufferSource-rate0.9', 5);
    groups ++;

    // ConvolverNode group
    // 1 convolver with 32768 frames
    score += this.calcScore('Convolver-32768f-743ms', 1);
    groups ++;

    return score / groups;
  }
}
