// fm-synthesizer.js
// Copyright (C) 2020 Kaz Nishimura
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
// for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* global sampleRate */

/**
 * Module script for the audio worklet processors.
 * This file must be imported by an
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet AudioWorklet}
 * object.
 *
 * @module fm-synthesizer.js
 */

// This file is a module script and shall be in strict mode by default.

const A3_KEY = 69;

class FMOperator
{
    constructor()
    {
        this._output = 0;
    }

    get output()
    {
        return this._output;
    }
}

class FMSynthesizer extends AudioWorkletProcessor
{
    constructor(options)
    {
        super(options);
        this._frequency = 0;
        this._operators = [0, 1, 2, 3].map(() => new FMOperator());
    }

    /**
     * Processes audio.
     *
     * @param {*} _inputs
     * @param {*} outputs
     * @return {boolean}
     */
    process(_inputs, outputs)
    {
        if (outputs.length >= 1) {
            for (let k = 0; k < outputs[0][0].length; ++k) {
                for (let i = 0; i < outputs.length; i++) {
                    for (let j = 0; j < outputs[i].length; j++) {
                        outputs[i][j][k] = this._operators[3].output;
                    }
                }
            }
        }
        return true;
    }
}

registerProcessor("fm-synthesizer", FMSynthesizer);
