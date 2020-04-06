### ResidentWAFSynth Host
This is a Web Audio application, written in HTML5 and Javascript, within which the ResidentWAFSynth is being developed.<br />
It can be tried out at https://james-ingram-act-two.de/open-source/ResidentWAFSynthHost/host.html <br />
The host uses the Web MIDI API's _Input Device_ interface so that an attached hardware MIDI input device can be used to control the synthesizer. This is, however, not absolutely necessary.<br />
<br />
**ResidentWAFSynth**<br />
This a GUI-less software synth, written entirely in Javascript, that uses the Web _Audio_ API to implement the Web _MIDI_ API's _Output Device_ interface. Such software synths can be included in websites as a substitute for end-user hardware MIDI Output devices, so they are especially useful on mobile devices. Also, since they themselves provide the MIDI Output Device interface, they don't depend on browser implementations of the Web MIDI API.<br />
<br />
This synth uses [WebAudioFont](https://github.com/surikov/webaudiofont) presets. These load very quickly, and can be arbitrarily configured in the `residentWAFSynth/webAudioFontDefs.js` file. For illustration purposes, the example in this repository is deliberately large. The equivalent file in other installations would typically be much smaller.<br />
The code for this synth owes a lot to Sergey Surikov's [WebAudioFontPlayer](https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js). In particular, the code for loading and adjusting presets is very similar to the code in his `WebAudioFontLoader`.<br />
The synth has the same controls as the _ResidentSf2Synth_ (its direct predecessor &mdash; see WebMIDISynthHost below), but with an additional reverberation control which is practically a clone of Surikov's `WebAudioFontReverberator`.<br />
It should be easy to add more controls in future using the reverberator as a model (Low Frequency Modulation, Ring-Modulation, Envelope controls etc.).<br />
<br />
Apart from having a MIDI interface, the main difference between the ResidentWAFSynth and Surikov's WebAudioFontPlayer is in the approach to note envelopes: The ResidentWAFSynth allows custom envelope settings to be provided for each preset zone. At a more general level, there are three types of (General MIDI) preset: Those that loop indefinitely (such as wind instruments, organs etc.) those that decay slowly (pianos, vibraphones etc.) and percussion instruments (which decay without looping, using their original sample). <br />
<br />
This synthesizer is still being developed. Please raise any issues, or make pull requests etc., here in this repository.<br />

#### Other Applications that use the ResidentWAFSynth:
1. [SimpleWebAudioFontSynthHost](https://james-ingram-act-two.de/open-source/SimpleWebAudioFontSynthHost/host.html): This is simple demo application, showing how to embed the synth in web pages.<br />
2. WebMIDISynthHost ([repository](https://github.com/notator/WebMIDISynthHost) and [application](https://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html)): This application began as a response to a discussion about software synths in [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />
3. AssistantPerformer ([repository](https://github.com/notator/AssistantPerformer), [application](https://james-ingram-act-two.de/open-source/assistantPerformer/assistantPerformer.html)).

James Ingram<br />
March 2020<br />




