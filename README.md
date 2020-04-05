### ResidentWAFSynth Host
This is a Web Audio application, written in HTML5 and Javascript within which the ResidentWAFSynth can be developed. It can be tried out at <br />
https://james-ingram-act-two.de/open-source/ResidentWAFSynthHost/host.html <br />
The host application uses the Web MIDI API to allow an attached hardware input MIDI device to control the synthesizer.
<br />
* **ResidentWAFSynth**<br />
The ResidentWAFSynth, written entirely in Javascript, is a GUI-less software synth that uses the Web _Audio_ API to implement the Web _MIDI_ API's _Output Device_ interface.<br />
Such software synthesizers can be included in websites as a substitute for end-user hardware MIDI Output devices. This makes them especially useful on mobile devices. Since they themselves provide the MIDI Output Device interface, they don't depend on browser implementations of the Web MIDI API.<br />
<br />
This synth uses [WebAudioFont](https://github.com/surikov/webaudiofont) presets which are both flexible to use and load very quickly. The WebAudioFonts can be arbitrarily configured in the `residentWAFSynth/webAudioFontDefs.js` file. For illustration purposes, the example in this repository is deliberately large. The equivalent file in other installations would typically be much smaller.<br />
The code for this synth owes a lot to Sergey Surikov's [WebAudioFontPlayer](https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js). In particular, the code for loading and adjusting presets is very similar to the code in his `WebAudioFontLoader`.<br />
The synth has the same controls as its predecessor (residentSf2Synth), but with an additional reverberation control (which is practically a clone of Surikov's `WebAudioFontReverberator`.<br />
It should be easy to add more controls in future using the reverberator as a model (Low Frequency Modulation, Ring-Modulation, Envelope controls etc.).<br />
<br />
Apart from the MIDI interface, the main difference between the ResidentWAFSynth and Surikov's WebAudioFontPlayer is in the approach to note envelopes: The ResidentWAFSynth tries to provide each preset with a realistic decay time for each instrument type. Instruments having looped samples fall into two categories: Those that loop indefinitely, such as wind instruments, organs etc., and those that decay slowly such as pianos, vibraphones etc. Percussion instruments decay quickly using their original sample. <br />
This synthesizer is still being developed. Issues relating to it should be raised here, in this repository.<br />

#### Other Applications that use the ResidentWAFSynth:
1. There is simple demo application, showing how to embed the synth in web pages, at:<br />
[SimpleWebAudioFontSynthHost](https://james-ingram-act-two.de/open-source/SimpleWebAudioFontSynthHost/host.html)<br />
2. The ResidentWAFSynth is included with some other Web MIDI Synths in my WebMIDISynthHost ([repository](https://github.com/notator/WebMIDISynthHost) and [application](https://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html)). The WebMIDISynthHost originally began as the reaction to a discussion about software synths in [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />
3. My AssistantPerformer ([repository](https://github.com/notator/AssistantPerformer), [application](https://james-ingram-act-two.de/open-source/assistantPerformer/assistantPerformer.html).

James Ingram<br />
March 2020<br />




