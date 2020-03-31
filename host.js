/*
*  copyright 2015 James Ingram
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  This file contains the implementation of the WebMIDISynthHost's GUI. 
*  The WebMIDISynthHost can host one or more WebMIDISynths and use one
*  or more SoundFonts.
*/

/*global WebMIDI, window,  document, performance */

WebMIDI.namespace('WebMIDI.host');

WebMIDI.host = (function(document)
{
	"use strict";

    var
        synth = new WebMIDI.residentWAFSynth.ResidentWAFSynth(),
        inputDevice = null,
        allRangeAndNumberInputElems = [], // used by AllControllersOff control

        getElem = function(elemID)
        {
            return document.getElementById(elemID);
        },

        handleInputMessage = function(e)
        {
            function getMsgString(data)
            {
                let str;

                switch(data.length)
                {
                    case 1:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")";
                        break;
                    case 2:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")" +
                              " data[1]=" + data[1].toString(10) + " (0x" + data[1].toString(16) + ")";
                        break;
                    case 3:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")" +
                              " data[1]=" + data[1].toString(10) + " (0x" + data[1].toString(16) + ")" +
                              " data[2]=" + data[2].toString(10) + " (0x" + data[2].toString(16) + ")";
                        break;
                    default:
                        str = "Strange message (too long).";
                        break;
                }

                return str;
            }

            function UpdateGUI_ControlsTable(ccIndex, ccValue)
            {
                for(var i = 0; i < allRangeAndNumberInputElems.length; i++)
                {
                    let inputElem = allRangeAndNumberInputElems[i];
                    if(inputElem.ccIndex !== undefined && inputElem.ccIndex === ccIndex)
                    {
                        inputElem.value = ccValue;
                    }
                }
            }

            function UpdateGUI_CommandsTable(cmdIndex, cmdValue)
            {
                for(var i = 0; i < allRangeAndNumberInputElems.length; i++)
                {
                    let inputElem = allRangeAndNumberInputElems[i];
                    if(inputElem.cmdIndex !== undefined && inputElem.cmdIndex === cmdIndex)
                    {
                        inputElem.value = cmdValue;
                    }
                }
            }

            var data = e.data;
            try
            {
                let CMD = WebMIDI.constants.COMMAND,
                    cmdIndex = data[0] & 0xF0;

                switch(cmdIndex)
                {
                    case CMD.NOTE_OFF:
                        break;
                    case CMD.NOTE_ON:
                        console.log("NoteOn: key=" + data[1] + ", velocity=" + data[2]);
                        break;
                    case CMD.AFTERTOUCH:
                        console.log("Aftertouch: key=" + data[1] + ", value=" + data[2]);
                        break;
                    case CMD.CONTROL_CHANGE:
                        UpdateGUI_ControlsTable(data[1], data[2]);
                        console.log("control change: " + getMsgString(data));
                        break;
                    case CMD.PRESET:
                        console.log("preset: " + getMsgString(data));
                        break;
                    case CMD.CHANNEL_PRESSURE:
                        UpdateGUI_CommandsTable(cmdIndex, data[1]);
                        console.log("channel pressure: value=" + data[1]);
                        break;
                    case CMD.PITCHWHEEL:
                        // The residentWAFSynth reacts to midi values in range 0..127,
                        // so data[1] (the fine byte) is ignored here. 
                        UpdateGUI_CommandsTable(cmdIndex, data[2]);
                        console.log("pitchWheel: value=" + data[2]);
                        break;


                    default:
                        console.warn("Unknown command sent from midi input device.")
                        break;
                } 
                synth.send(data, performance.now());                
            }
            catch(msg)
            {
                console.warn("Synth threw an exception:\n" + msg + getMsgString(data));
            }
        },

        setInputDeviceEventListener = function(inputDeviceSelect)
        {
            if(inputDevice !== null)
            {
                inputDevice.removeEventListener("midimessage", handleInputMessage, false);
                inputDevice.close();
            }

            inputDevice = inputDeviceSelect.options[inputDeviceSelect.selectedIndex].inputDevice;
            if(inputDevice)
            {
                inputDevice.addEventListener("midimessage", handleInputMessage, false);
                inputDevice.open();
            }
            else
            {
                alert("Can't open input device.");
                inputDeviceSelect.selectedIndex = 0;
            }
        },

        onInputDeviceSelectChanged = function()
        {
            let ids = getElem("inputDeviceSelect");

            if(ids.selectedIndex > 0)
            {
                setInputDeviceEventListener(ids);
            }
            else
            {
                inputDevice = null;
            }
        },

		openInNewTab = function(url)
		{
			var win = window.open(url, '_blank');
			win.focus();
		},

		gitHubButtonClick = function()
		{
			var url = "https://github.com/notator/ResidentWAFSynthHost";
			openInNewTab(url);
		},

		synthWebsiteButtonClick = function()
		{
			openInNewTab(synth.url);
		},

		webAudioFontWebsiteButtonClick = function()
		{
            let webAudioFontSelect = getElem("webAudioFontSelect"),
                selectedOption = webAudioFontSelect[webAudioFontSelect.selectedIndex];

			openInNewTab(selectedOption.url);
		},

		onChannelSelectChanged = function()
        {
            function setGUIControls(synthChannelControlsState)
            {
                function setGUIControl(ccIndex, ccValue)
                {
                    for(var i = 0; i < allRangeAndNumberInputElems.length; i++)
                    {
                        let ctlElem = allRangeAndNumberInputElems[i];
                        if(ctlElem.ccIndex === ccIndex)
                        {
                            ctlElem.value = ccValue;
                        }
                    }
                }
                function setGUICommand(cmdIndex, cmdValue)
                {
                    for(var i = 0; i < allRangeAndNumberInputElems.length; i++)
                    {
                        let cmdElem = allRangeAndNumberInputElems[i];
                        if(cmdElem.cmdIndex === cmdIndex)
                        {
                            cmdElem.value = cmdValue;
                        }
                    }
                }
                function setPresetSelect(bankIndex, presetIndex)
                {
                    let presetSelect = getElem("presetSelect"),
                        options = presetSelect.options;

                    for(var i = 0; i < options.length; i++)
                    {
                        let preset = options[i].preset;
                        if(preset.bankIndex === bankIndex && preset.presetIndex === presetIndex)
                        {
                            presetSelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                let CMD = WebMIDI.constants.COMMAND,
                    CTL = WebMIDI.constants.CONTROL,
                    bankIndex, presetIndex; // set in the following loop

                for(var i = 0; i < synthChannelControlsState.length; i++)
                {
                    let info = synthChannelControlsState[i],
                        ccIndex = info.ccIndex,
                        ccValue = info.ccValue,
                        cmdIndex = info.cmdIndex,
                        cmdValue = info.cmdValue;

                    if(ccIndex !== undefined)
                    {
                        if(ccIndex === CTL.BANK)
                        {
                            bankIndex = ccValue;
                        }
                        else
                        {
                            setGUIControl(ccIndex, ccValue);
                        }
                    }
                    else // cmdIndex !== undefined)
                    {
                        if(cmdIndex === CMD.PRESET)
                        {
                            presetIndex = cmdValue;
                        }
                        else
                        {
                            setGUICommand(cmdIndex, cmdValue);
                        }
                    }
                }

                setPresetSelect(bankIndex, presetIndex);
            }

            let channelSelect = getElem("channelSelect"),
                channel = channelSelect.selectedIndex,
                synthChannelControlsState = synth.channelControlsState(channel);

            // channelData contains all the info necessary for setting the GUI controls.
            setGUIControls(synthChannelControlsState);
		},

        // called
        // 1. by onWebAudioFontSelectChanged() when called after synth.open,
        // 2. by changing the presetSelect value for a channel
        // 3. by clicking the presetSelect "send again" button.
		onPresetSelectChanged = function()
		{
			let CMD = WebMIDI.constants.COMMAND,
				CTL = WebMIDI.constants.CONTROL,
				channelSelect = getElem("channelSelect"),
				presetSelect = getElem("presetSelect"),
				channel = channelSelect.selectedIndex,
				selectedOption = presetSelect.options[presetSelect.selectedIndex],
				bankIndex, presetIndex;


			if(selectedOption.preset !== undefined)
			{
				presetIndex = selectedOption.preset.presetIndex;
				bankIndex = selectedOption.preset.bankIndex;
			}

			let status = CMD.CONTROL_CHANGE + channel;
			let data1 = CTL.BANK;
			let message = new Uint8Array([status, data1, bankIndex]);
			synth.send(message, performance.now());

			status = CMD.PRESET + channel;
			message = new Uint8Array([status, presetIndex]);
            synth.send(message, performance.now());

            for(let chnl = 0; chnl < 16; chnl++)
            {
                synth.setAllControllersOff(chnl); // sets all controls except bank and preset to their default values
            }

            onChannelSelectChanged(); // updates the GUI
		},

		setOptions = function(select, options)
		{
			var i;

			for(i = select.options.length - 1; i >= 0; --i)
			{
				select.remove(i);
			}

			for(i = 0; i < options.length; ++i)
			{
				select.add(options[i]);
			}

			select.selectedIndex = 0;
		},

		sendCommand = function(commandIndex, data1, data2)
		{
			var CMD = WebMIDI.constants.COMMAND,
				channelSelect = getElem("channelSelect"),
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = commandIndex + channelIndex,
				message;

			switch(commandIndex)
			{
				case CMD.NOTE_ON:
				case CMD.NOTE_OFF:
				case CMD.AFTERTOUCH:
				case CMD.CONTROL_CHANGE:
					message = new Uint8Array([status, data1, data2]); // data1 can be RegisteredParameter or DataEntry controls
					break;
				case CMD.PRESET:
				case CMD.CHANNEL_PRESSURE:
					message = new Uint8Array([status, data1]);
					break;
				case CMD.PITCHWHEEL:
					// This host uses the same 7-bit MSB (0..127) for data1 and data2.
					// Doing this means that the available pitchWheel values are equally spaced
					// and span the complete pitchWheel deviation range.
					message = new Uint8Array([status, data1, data1]);
					break;
				default:
					console.warn("Error: Not a command, or attempt to set the value of a command that has no value.");
			}
			synth.send(message, performance.now());
		},

		setCommandsAndControlsDivs = function()
		{
			var CMD = WebMIDI.constants.COMMAND;

            function empty(table)
            {
                for(let i = table.childNodes.length - 1; i >= 0; --i)
                {
                    table.removeChild(table.childNodes[i]);
                }
            }

			function sendLongControl(controlIndex, value)
			{
				sendCommand(CMD.CONTROL_CHANGE, controlIndex, value);
			}

			function sendShortControl(controlIndex)
			{
				function resetHostGUI()
				{
					var i, inputID, numberInputElem;

					for(i = 0; i < allRangeAndNumberInputElems.length; ++i)
                    {
                        let inputControl = allRangeAndNumberInputElems[i];
                        inputControl.value = inputControl.defaultValue;
					}
				}

				if(controlIndex === WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF)
				{
					resetHostGUI();					
				}

				sendCommand(CMD.CONTROL_CHANGE, controlIndex);
			}

			// Returns true if the synth implements one or more of the following commands:
			// PRESET, CHANNEL_PRESSURE, PITCHWHEEL, AFTERTOUCH.
			// These are the only commands to be displayed in the Commands Div.
			// None of these commands MUST be implemented, so hasCommandsDiv() may return false. 
			// Other commands:
			// If CONTROL_CHANGE is implemented, the Controls Div will be displayed.
			// NOTE_ON MUST be implemented, otherwise the host can't play anything.
			// The Notes Div is therefore always displayed.
			// Whether the synth implements NOTE_OFF or not only needs to be determined inside the sendNoteOff function.
			function hasCommands(commands)
			{
				var i, rval = false;
				if(commands !== undefined)
				{
					for(i = 0; i < commands.length; ++i)
					{
						if(commands[i] === CMD.PRESET
							|| commands[i] === CMD.CHANNEL_PRESSURE
							|| commands[i] === CMD.PITCHWHEEL
							|| commands[i] === CMD.AFTERTOUCH)
						{
							rval = true;
							break;
						}
					}
				}

				return rval;
			}

			function appendPresetSelect(presetSelectCell, presetOptionsArray)
			{
				var tr = document.createElement("tr"),
					td, presetSelect, input;

				presetSelect = document.createElement("select");
				presetSelect.id = "presetSelect";
				presetSelect.className = "presetSelect";
				setOptions(presetSelect, presetOptionsArray);
				presetSelect.onchange = onPresetSelectChanged;
                presetSelectCell.appendChild(presetSelect);

				input = document.createElement("input");
				input.type = "button";
				input.className = "sendAgainButton";
				input.value = "send again";
				input.onclick = onPresetSelectChanged;
                presetSelectCell.appendChild(input);
            }

            // called by both commands and CCs
            function setTwinInputControl(currentTarget, value)
            {
                currentTarget.twinInputElem.value = value;
            }

            // called by both commands and CCs
            function setBasicRow(tr, name, defaultValue, infoString)
            {
                let td, rangeInputElem, numberInputElem, buttonInputElem;

                td = document.createElement("td");
                tr.appendChild(td);
                td.className = "left";
                td.innerHTML = name;

                // this td contains the slider, number and button inputs
                td = document.createElement("td");
                tr.appendChild(td);

                rangeInputElem = document.createElement("input");
                numberInputElem = document.createElement("input");
                buttonInputElem = document.createElement("input");
                td.appendChild(rangeInputElem);
                td.appendChild(numberInputElem);
                td.appendChild(buttonInputElem);

                // slider input                        
                rangeInputElem.type = "range";
                rangeInputElem.className = "midiSlider";
                rangeInputElem.twinInputElem = numberInputElem;
                rangeInputElem.value = defaultValue;
                rangeInputElem.defaultValue = defaultValue;
                rangeInputElem.min = 0;
                rangeInputElem.max = 127;

                // number input                        
                numberInputElem.type = "number";
                numberInputElem.className = "number";
                numberInputElem.twinInputElem = rangeInputElem;
                numberInputElem.value = defaultValue;
                numberInputElem.defaultValue = defaultValue;
                numberInputElem.min = 0;
                numberInputElem.max = 127;

                // button input
                buttonInputElem.type = "button";
                buttonInputElem.className = "sendAgainButton";
                buttonInputElem.value = "send again";
                buttonInputElem.numberInputElem = numberInputElem;

                td = document.createElement("td");
                tr.appendChild(td);
                td.innerHTML = infoString;

                allRangeAndNumberInputElems.push(rangeInputElem);
                allRangeAndNumberInputElems.push(numberInputElem);

                return { rangeInputElem, numberInputElem, buttonInputElem };
            }

            function setCommandsTable(commands)
            {
                // sets the presetSelect and 
                // returns an array of tr elements
                function getCommandRows(cmdIndices)
                {
                    function setCommandRow(tr, name, defaultValue, cmdIndex)
                    {
                        function onCommandInputChanged(event)
                        {
                            var currentTarget = event.currentTarget,
                                value = currentTarget.valueAsNumber,
                                cmdIndex = currentTarget.cmdIndex;

                            // can only be CHANNEL_PRESSURE or PITCHWHEEL
                            console.assert(cmdIndex === WebMIDI.constants.COMMAND.PITCHWHEEL || cmdIndex === WebMIDI.constants.COMMAND.CHANNEL_PRESSURE);

                            sendCommand(cmdIndex, value);
                            setTwinInputControl(currentTarget, value);
                        }

                        function onSendCommandAgainButtonClick(event)
                        {
                            var numberInputElem = event.currentTarget.numberInputElem,
                                value = numberInputElem.valueAsNumber,
                                cmdIndex = numberInputElem.cmdIndex;

                            // can only be CHANNEL_PRESSURE or PITCHWHEEL
                            console.assert(cmdIndex === WebMIDI.constants.COMMAND.PITCHWHEEL || cmdIndex === WebMIDI.constants.COMMAND.CHANNEL_PRESSURE);

                            sendCommand(cmdIndex, value);
                        }

                        let basicRow = setBasicRow(tr, name, defaultValue, "Cmd " + cmdIndex.toString());

                        basicRow.rangeInputElem.cmdIndex = cmdIndex;
                        basicRow.rangeInputElem.onchange = onCommandInputChanged;
                        basicRow.numberInputElem.cmdIndex = cmdIndex;
                        basicRow.numberInputElem.onchange = onCommandInputChanged;
                        basicRow.buttonInputElem.onclick = onSendCommandAgainButtonClick;                        
                    }

                    let tr, rval = [];
                    for(let i = 0; i < cmdIndices.length; ++i)
                    {
                        let c = WebMIDI.constants,
                            cmdIndex = cmdIndices[i];

                        if(cmdIndex === CMD.PRESET)
                        {
                            console.assert(synth.name === "ResidentWAFSynth", "Error: This app only uses the residentWAFSynth.");
                            let presetSelectCell = getElem("presetSelectCell")
                            appendPresetSelect(presetSelectCell, webAudioFontSelect[webAudioFontSelect.selectedIndex].presetOptionsArray);
                            onWebAudioFontSelectChanged(true);
                        }
                        else if(cmdIndex === CMD.CHANNEL_PRESSURE || cmdIndex === CMD.PITCHWHEEL || cmdIndex === CMD.AFTERTOUCH)
                        {
                            let name = c.commandName(cmdIndex),
                                defaultValue = c.commandDefaultValue(cmdIndex);

                            tr = document.createElement("tr")
                            rval.push(tr);
                            setCommandRow(tr, name, defaultValue, cmdIndex);
                        }
                    }

                    return rval;
                }

                let commandsTable = getElem("commandsTable"),
                    commandRows = getCommandRows(commands);

                for(let i = 0; i < commandRows.length; ++i)
                {
                    let tr = commandRows[i];
                    commandsTable.appendChild(tr);
                }
            }

			function setControlsTable(controls)
			{
				// returns an array of tr elements
				function getControlRows(ccIndices)
				{
					// 3-byte controls
					function setLongControlRow(tr, name, defaultValue, ccIndex)
					{
						function onControlInputChanged(event)
						{
                            let currentTarget = event.currentTarget,                                
                                ccIndex = currentTarget.ccIndex,
                                value = currentTarget.valueAsNumber;

                            sendLongControl(ccIndex, value);
                            setTwinInputControl(currentTarget, value);
						}

						function onSendControlAgainButtonClick(event)
						{
							var numberInputElem = event.currentTarget.numberInputElem,
                                ccIndex = numberInputElem.ccIndex,
                                value = numberInputElem.valueAsNumber;

                            sendLongControl(ccIndex, value);
                        }

                        let basicRow = setBasicRow(tr, name, defaultValue, "CC " + ccIndex.toString());

                        basicRow.rangeInputElem.ccIndex = ccIndex;
                        basicRow.rangeInputElem.onchange = onControlInputChanged;
                        basicRow.numberInputElem.ccIndex = ccIndex;
                        basicRow.numberInputElem.onchange = onControlInputChanged;
                        basicRow.buttonInputElem.onclick = onSendControlAgainButtonClick; 
                    }

					// 2-byte uControls
					function setShortControlRow(tr, name, ccIndex)
					{
						var
							button,
							td = document.createElement("td");

						function onSendShortControlButtonClick(event)
						{
                            sendShortControl(event.currentTarget.ccIndex);
						}

						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = name;

						td = document.createElement("td");
						tr.appendChild(td);
						button = document.createElement("input");
						button.type = "button";
						button.className = "sendButton";
						button.value = "send";
                        button.ccIndex = ccIndex;
						button.onclick = onSendShortControlButtonClick;
						td.appendChild(button);

                        let node = document.createTextNode("CC " + ccIndex.toString());
                        td.appendChild(node);
                    }

                    let rval = [];
					for(let i = 0; i < ccIndices.length; ++i)
					{
                        let c = WebMIDI.constants,
                            ccIndex = ccIndices[i],                            
                            name = c.controlName(ccIndex),
                            defaultValue = c.controlDefaultValue(ccIndex),
                            tr = document.createElement("tr");

                        rval.push(tr);

						if(defaultValue === undefined)
                        {
                            if(ccIndex === c.CONTROL.ALL_CONTROLLERS_OFF)
                            {
                                name = name + " (set defaults)";
                            }
                            setShortControlRow(tr, name, ccIndex);
						}
						else
						{
                            if(!(ccIndex === c.CONTROL.BANK || ccIndex === c.CONTROL.REGISTERED_PARAMETER_COARSE))
                            {
                                if(ccIndex === c.CONTROL.DATA_ENTRY_COARSE)
                                {
                                    name = name + " (pitchWheel range)";
                                }
                                setLongControlRow(tr, name, defaultValue, ccIndex);
							}
						}
					}

					return rval;
                }

                let controlsTable = getElem("controlsTable"),
                    controlRows = getControlRows(controls);

				for(let i = 0; i < controlRows.length; ++i)
				{
					let tr = controlRows[i];
                    controlsTable.appendChild(tr);
				}
			}

			allRangeAndNumberInputElems.length = 0;

            empty(controlsTable);

            getElem("commandsAndControlsDiv").style.display = "block";

			setCommandsTable(synth.commands);

			setControlsTable(synth.controls);

			sendShortControl(WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF);
		},

		// exported
		onWebAudioFontSelectChanged = function(isInitializing)
		{
			let webAudioFontSelect = getElem("webAudioFontSelect"),
				presetSelect = getElem("presetSelect"),
				selectedSoundFontOption = webAudioFontSelect[webAudioFontSelect.selectedIndex],
				soundFont = selectedSoundFontOption.soundFont,
				presetOptionsArray = selectedSoundFontOption.presetOptionsArray;

			synth.setSoundFont(soundFont);

			setOptions(presetSelect, presetOptionsArray);
            presetSelect.selectedIndex = 0;
            if(!isInitializing)
            {
                getElem("channelSelect").selectedIndex = 0;

                let option0 = presetSelect.options[0],
                    presetIndex = option0.preset.presetIndex,
                    bankIndex = option0.preset.bankIndex;

                synth.setAllChannelPresets(bankIndex, presetIndex);

                // sets all controls except bank and preset to their default values
                // then updates the GUI
                onPresetSelectChanged();
            }
		},

		// exported.
		onContinueAtStartClicked = function()
		{
			function setWebAudioFontTableDisplay(synth)
			{
				function getWebAudioFontOptions(webAudioFonts)
				{
					let options = [];

					for(var fontIndex = 0; fontIndex < webAudioFonts.length; fontIndex++)
					{
						let option = new Option("webAudioFontOption"),
							webAudioFont = webAudioFonts[fontIndex];

						let presetOptionsArray = [];
						for(let bankIndex = 0; bankIndex < webAudioFont.banks.length; bankIndex++)
						{
							let bank = webAudioFont.banks[bankIndex];
							for(var j = 0; j < bank.length; j++)
							{
								let preset = bank[j],
									presetOption = new Option("presetOption");

								presetOption.innerHTML = preset.name;
								presetOption.preset = preset;

								presetOptionsArray.push(presetOption);
							}
						}

						option.innerHTML = webAudioFont.name;
						option.soundFont = webAudioFont;
						option.presetOptionsArray = presetOptionsArray; // used to set the presetSelect
						option.url = "https://github.com/surikov/webaudiofont";

						options.push(option);
					}

					return options;
				}

                let
                    webAudioFontDiv = getElem("webAudioFontDiv"),
                    webAudioFontSelect = getElem("webAudioFontSelect");

                console.assert(synth.name === "ResidentWAFSynth", "Error: this app only uses the ResidentWAFSynth")

                let options = getWebAudioFontOptions(synth.webAudioFonts);

				setOptions(webAudioFontSelect, options);

				webAudioFontSelect.selectedIndex = 0;

				webAudioFontDiv.style.display = "block";
			}

            synth.open();

            setInputDeviceEventListener(getElem("inputDeviceSelect"));

            getElem("continueAtStartButtonDiv").style.display = "none";

			setWebAudioFontTableDisplay(synth);

			setCommandsAndControlsDivs();

            getElem("notesDiv").style.display = "block";
		},

		noteCheckboxClicked = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note2Checkbox = getElem("sendNote2Checkbox");

			if((!note1Checkbox.checked) && (!note2Checkbox.checked))
			{
				note2Checkbox.checked = true;
			}
		},

		sendNoteOn = function(noteIndex, noteVelocity)
		{
			sendCommand(WebMIDI.constants.COMMAND.NOTE_ON, noteIndex, noteVelocity);
		},

		sendNoteOff = function(noteIndex, noteVelocity)
		{
            var
                NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
                NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF;

			if(synth.commands.indexOf(NOTE_OFF) >= 0)
			{
				sendCommand(NOTE_OFF, noteIndex, noteVelocity);
			}
			else
			{
				sendCommand(NOTE_ON, noteIndex, 0);
			}
		},

		doNotesOn = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note1Index = getElem("notesDivIndexInput1").valueAsNumber,
				note1Velocity = getElem("notesDivVelocityInput1").valueAsNumber,
				note2Checkbox = getElem("sendNote2Checkbox"),
				note2Index = getElem("notesDivIndexInput2").valueAsNumber,
				note2Velocity = getElem("notesDivVelocityInput2").valueAsNumber,
				holdCheckbox = getElem("holdCheckbox"),
				sendButton = getElem("sendButton");

			if(holdCheckbox.checked === true)
			{
				sendButton.disabled = true;
			}

			if(note1Checkbox.checked)
			{
				sendNoteOn(note1Index, note1Velocity);
			}
			if(note2Checkbox.checked)
			{
				sendNoteOn(note2Index, note2Velocity);
			}
		},

		doNotesOff = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note1Index = getElem("notesDivIndexInput1").valueAsNumber,
				note1Velocity = getElem("notesDivVelocityInput1").valueAsNumber,
				note2Checkbox = getElem("sendNote2Checkbox"),
				note2Index = getElem("notesDivIndexInput2").valueAsNumber,
				note2Velocity = getElem("notesDivVelocityInput2").valueAsNumber;

			if(note1Checkbox.checked)
			{
				sendNoteOff(note1Index, note1Velocity);
			}
			if(note2Checkbox.checked)
			{
				sendNoteOff(note2Index, note2Velocity);
			}
		},

        holdCheckboxClicked = function()
        {
            let holdCheckbox = getElem("holdCheckbox");

            doNotesOff();

            if(holdCheckbox.checked === false)
            {
                getElem("sendButton").disabled = false;
            }
        },

		init = function()
		{
            function setupInputDevice()
            {
                function setInputDeviceSelect(midiAccess)
                {
                    let iDevSelect = getElem("inputDeviceSelect"),
                        option;

                    iDevSelect.options.length = 0; // important when called by midiAccess.onstatechange 

                    option = document.createElement("option");
                    if(midiAccess !== null)
                    {
                        option.text = "choose a MIDI input device";
                        iDevSelect.add(option, null);
                        midiAccess.inputs.forEach(function(port)
                        {
                            //console.log('input id:', port.id, ' input name:', port.name);
                            option = document.createElement("option");
                            option.inputDevice = port;
                            option.text = port.name;
                            iDevSelect.add(option, null);
                        });
                        iDevSelect.disabled = false;
                    }
                    else
                    {
                        option.text = "There are no MIDI input devices available";
                        iDevSelect.add(option, null);
                        iDevSelect.disabled = true;
                    }

                    for(var i = iDevSelect.options.length - 1; i >= 0; --i)
                    {
                        iDevSelect.selectedIndex = i;
                        if(iDevSelect[iDevSelect.selectedIndex].text === "E-MU Xboard49")
                        {
                            inputDevice = iDevSelect[iDevSelect.selectedIndex].inputDevice;
                            break;
                        }
                    }
                }

                function onSuccessCallback(midiAccess)
                {
                    // Add the midiAccess.inputs to the inputDeviceSelect.
                    setInputDeviceSelect(midiAccess);
                }

                // This function will be called either
                // if the browser does not support the Web MIDI API,
                // or if the user refuses permission to use his hardware MIDI devices.
                function onErrorCallback()
                {
                    alert("Error getting midiAccess for the inputDevice.");
                };

                navigator.requestMIDIAccess().then(onSuccessCallback, onErrorCallback);
            }

            function setInitialDivsDisplay()
            {
                getElem("loadingMsgDiv").style.display = "none";
                getElem("continueAtStartButtonDiv").style.display = "block";

                getElem("webAudioFontDiv").style.display = "none";
                getElem("commandsAndControlsDiv").style.display = "none";

                getElem("notesDiv").style.display = "none";
            }

            setupInputDevice();
			setInitialDivsDisplay();
		},

		publicAPI =
		{
            gitHubButtonClick: gitHubButtonClick,

            onInputDeviceSelectChanged: onInputDeviceSelectChanged,

			onContinueAtStartClicked: onContinueAtStartClicked,

			synthWebsiteButtonClick: synthWebsiteButtonClick,
			soundFontWebsiteButtonClick: webAudioFontWebsiteButtonClick,

			onChannelSelectChanged: onChannelSelectChanged,
			onWebAudioFontSelectChanged: onWebAudioFontSelectChanged,
			onPresetSelectChanged: onPresetSelectChanged,

			noteCheckboxClicked: noteCheckboxClicked,
			holdCheckboxClicked: holdCheckboxClicked,

			doNotesOn: doNotesOn,
			doNotesOff: doNotesOff
		};
	// end var

	init();

	return publicAPI;

}(document));
