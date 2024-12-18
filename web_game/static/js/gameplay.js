'use strict';
// Map initializing
let options = {
    inertia: true,
    inertiaMaxSpeed: 1000,
    keyboard: true,
    zoomControl: false,
    // center: L.latLng(50, 100),
}
const map = L.map('map', options).setView([45, 10], 2.5);
let corner1 = L.LatLng(-180, -90)
let corner2 = L.LatLng(180, 90)
let bounds = L.LatLngBounds(corner2, corner1);
map.setMaxBounds(bounds);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    minZoom: 2.0,
    maxZoom: 2.0,
}).addTo(map);

// Game Variable

let body = document.querySelector("body");
let game_data_holder = document.querySelector("#sneaky-data");
let game_data = JSON.parse(game_data_holder.innerText);
const game_id = game_data[0].id;

let all_airports = [];
console.log(game_id);

body.removeChild(game_data_holder);
//

// Utilities
const timer = ms => new Promise(res => setTimeout(res, ms));
//

async function gameInitialize() {
    console.log(`Game Initalize`)
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            console.log(game_data[0]);
            const other_choices = document.querySelector("#other-choices");
            const skip_turn = document.createElement('button');

            // Skip turn button
            skip_turn.id = "skip-turn";

            skip_turn.innerText = 'Skip this turn (Do nothing)';
            other_choices.appendChild(skip_turn);

            skip_turn.addEventListener("mouseover", () => {
                skip_turn.style.borderColor = `red`;
            })
            skip_turn.addEventListener("mouseout", () => {
                skip_turn.style.borderColor = `black`;
            })
            skip_turn.addEventListener("mousedown", () => {
                skip_turn.style.backgroundColor = `gray`;
            })
            skip_turn.addEventListener("mouseup", () => {
                skip_turn.style.backgroundColor = `white`;
            })
            // End skip turn button

            // All airports fetch
            let retries = 5, seconds = 3000;
            let success = false;
            while (!success && retries--) {
                try {
                    all_airports = await fetch(`/api/airports/${game_id}`)
                    all_airports = await all_airports.json()
                    console.log(`THIS IS all_airports = []`);
                    console.log(all_airports);
                    success = all_airports.success;
                    if (success) {
                        console.log(`Fetched airports successfully.`);
                        break;
                    }
                } catch (err) {
                    console.log(`Fetching airports info from game ${game_id} failed: ${err}.`)
                } finally {
                    if (!success) {
                        console.log(`Trying to fetch from /api/airports/${game_id} again in ${seconds / 1000}`);
                        await timer(seconds);
                    }
                }
            }
            console.log(`Fetched airports ${all_airports.success ? 'successfully' : 'failed'}`)
            console.log(all_airports)
            // End all airports fetch

            await update_new_game_stats(game_data[0]);
            await update_progress_bars(game_data[0]);


            // Minimize button
            const panel_minimize = document.querySelector("#panel-minimize");
            const minimize_btn = document.createElement("button");

            panel_minimize.appendChild(minimize_btn);

            minimize_btn.innerText = `--`
            minimize_btn.addEventListener('click', async () => {
                document.querySelector('#panel').style.display = 'none';
            })
            // End minimize button

            // Panel reopen button
            const open_choice_panel = document.querySelector("#open-choice-panel");
            const reopen_btn = document.createElement("button");

            open_choice_panel.appendChild(reopen_btn);
            open_choice_panel.style = `
                display: flex;
                align-content: center;
                justify-content: center;
            `

            reopen_btn.innerText = `Available options`;
            reopen_btn.style = `
                height: 100px;
                align-self: center;
            `
            reopen_btn.addEventListener('mouseover', () => {
                reopen_btn.style.backgroundColor = '#ddd';
                reopen_btn.style.cursor = 'pointer';
            });

            reopen_btn.addEventListener('mouseout', () => {
                reopen_btn.style.backgroundColor = '';
                reopen_btn.style.cursor = 'default';
            });

            reopen_btn.addEventListener('mousedown', () => {
                reopen_btn.style.transform = 'scale(0.95)'; 
            });

            reopen_btn.addEventListener('mouseup', () => {
                reopen_btn.style.transform = 'scale(1)';
            });

            reopen_btn.addEventListener('click', async () => {
                document.querySelector("#panel").style.display = 'flex';
            })

            resolve();
        })
    })

}

function story() {
    return;
}

async function fetchChoice() {
    /* 
    This function will get all available choices from a game
    that the player haven't made. (Dunno why should this be but
    it's a feature nonetheless) ;)
     */
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            let success = false;
            let retries = 5, wait_length = 3000;
            while (!success && retries--) {
                try {
                    var all_available_choices = await fetch(`/api/games/${game_id}/make_choice`);
                    all_available_choices = await all_available_choices.json()
                    success = all_available_choices.success;
                    if (success) {
                        console.log("Successfully executed make_choice api");
                        break;
                    }
                } catch (error) {
                    console.error(`Error fetching game with /api/games/game_id/make_choice: ${error}`);
                } finally {
                    if (!success) {
                        console.log(`Trying fetching from /api/games/${game_id}/make_choice again in ${wait_length / 1000} seconds.`)
                        await timer(wait_length);
                    }
                }
            }
            resolve(all_available_choices.choices);
        })
    })
}

function filterChoice(all_choices) {
    const filtered_choices = [];
    let check_array = new Array(all_choices.length + 1).fill(false);
    let possible_choices = Math.min(3, all_choices.length);
    for (let i = 0; i < possible_choices; i++) {
        while (true) {
            let random_number = Math.round(Math.random() * (all_choices.length))
            if (random_number === all_choices.length) random_number -= 1;
            if (check_array[random_number] === false) {
                check_array[random_number] = true;
                filtered_choices.push(all_choices[random_number]);
                break;
            }
        }
    }
    return filtered_choices;
}

async function renderChoice() {
    /* 
    In order for the player to make choice, we need:
    1. Load all existing choices that the player haven't made
    2. Choose 3/5 from the list
    3. Show them on the screen (preferably a Panel, or something that 
    pop ups and let the player choose)
    4. Return the formatted data of the choice as the return value
    */
    // Step 1
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            console.log("RENDER CHOICE FUNCTION INITIATED");
            let retries = 3, seconds = 1;
            while (retries--) {
                try {
                    var all_choices = await fetchChoice();
                } catch (err) {
                    console.log(`fetchChoice() failed to fetch data: ${err}.`)
                    console.log(`Retrying after ${seconds} seconds.`)
                }
            }
            // Step 2
            const filtered_choices = filterChoice(all_choices);
            for (let item of filtered_choices) {
                console.log(item);
            }

            // Step 3
            // document.querySelector(`
            //     .leaflet-tile-pane
            // `).style.opacity = 0.5

            const panel = document.querySelector('#panel');
            panel.style.display = 'flex';
            setTimeout(() => {
                panel.style.opacity = '1';
            }, 3)

            let itemList = document.querySelector(".item-list")
            itemList.innerHTML = '';
            let warning = document.querySelector("#possible-warning");
            warning.innerText = '';
            for (let choice of filtered_choices) {
                let article = document.createElement('article');
                let h2 = document.createElement('h2');
                let p = document.createElement('p');

                article.choice_id = choice.id;

                h2.innerText = choice.name;
                p.innerText = `Cost: ${choice.cost} moni`;

                article.style = `
                    width: ${(90 - filtered_choices.length * 2) / filtered_choices.length}%;
                    margin : 1%;
                    height : 16rem;
                    border-radius : 8px;
                    border: solid green;
                `;
                article.appendChild(h2);
                article.appendChild(p);

                itemList.appendChild(article);
            }
            await timer(2000);
            resolve(filtered_choices);
            // dev note: ADD CHOICE OF DOING NOTHING AS A SMALL BUTTON
        })
    })
}

async function getUserChoice() {
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            console.log("GET USER CHOICE FUNCTION INITIATED");
            const all_choices_on_panel = document.querySelectorAll('article');
            for (let choice of all_choices_on_panel) {
                // Choice :: Article 
                choice.addEventListener('mouseover', () => {
                    choice.style.border = `solid red`;
                })
                choice.addEventListener('mouseout', () => {
                    choice.style.border = 'solid green';
                })
                choice.addEventListener('mousedown', () => {
                    choice.style.backgroundColor = 'gray';
                })
                choice.addEventListener('mouseup', () => {
                    choice.style.backgroundColor = 'white';
                })
                choice.addEventListener('click', async () => {
                    let choice_id = choice.choice_id;
                    let success = false;
                    let retries = 5, wait_length = 3000;
                    while (!success && retries--) {
                        try {
                            var response = await fetch(`/api/games/${game_id}/process_choice`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    "choice_id": choice_id,
                                }),
                                headers: {
                                    "Content-Type": "application/json",
                                }
                            })
                            response = await response.json();
                            success = response.success;
                            if (success) {
                                let panel = document.querySelector('#panel')
                                setTimeout(() => {
                                    panel.style.opacity = '0';
                                    setTimeout(() => {
                                        panel.style.display = 'none';
                                    }, 2)
                                }, 10)

                                console.log(response.message);
                                console.log(`User chose: ${choice_id}.`);
                                resolve(`{"status": "User chose ${choice_id}", "value": 100}`)
                            }
                            else if (!success) {
                                document.querySelector('#possible-warning').innerText = response.message;
                            }
                        } catch (err) {
                            document.querySelector('#possible-warning').innerText = err;
                        } finally {
                            if (!success && !(response.err == 400)) {
                                console.log(`Trying /api/games/${game_id}/process_choice again in ${wait_length / 1000} seconds.`)
                                await timer(wait_length);
                            }
                        }
                    }
                })
            }
            let skip_turn = document.querySelector("#skip-turn")
            skip_turn.addEventListener("click", () => {
                let panel = document.querySelector('#panel');
                setTimeout(() => {
                    panel.style.opacity = '0';

                    setTimeout(() => {
                        panel.style.display = 'none';
                    }, 1)
                }, 10)

                resolve(`{"status": "Turn skipped", "value": 101}`)
            })
            await timer(2000);
        })
    })
}

async function spreadDisease() {
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            let retries = 3, seconds = 3000;
            let success = false;
            while (!success && retries--) {
                try {
                    var response = await fetch(`/api/games/${game_id}/infection_spread`, {
                        method: 'POST',
                        body: {},
                        headers: {},
                    })

                    response = await response.json()
                    success = response.success

                    if (success) {
                        console.log(`Disease spreaded`);
                    }
                } catch (err) {
                    console.log(`Error spreading the disease: ${err}.`);
                } finally {
                    if (!success) {
                        console.log(`Trying infection_spread again after ${seconds / 1000} seconds.`);
                        await timer(seconds);
                    }
                }
            }
            await timer(2000);
            resolve();
        })
    })
}

async function end_game() {
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            let retries = 5, wait_length = 3000;
            let success = false;
            while (!success) {
                try {
                    var response = await fetch(`/api/games/${game_id}/check_status`);
                    response = await response.json();

                    success = (response.status == 'success') ? true : false;

                    if (success) {
                        console.log(`Succesfully fetched from /api/games/game_id/check_status`);
                        let game_over = response.game_over;
                        return resolve([game_over, response.message]);
                    }
                } catch (err) {
                    console.log(`Check game_status for game ${game_id} failed: ${err}`);
                } finally {
                    if (!success) {
                        console.log(`Retrying after ${wait_length / 1000} seconds.`);
                        await timer(wait_length);
                    }
                }
            }
        })
    })
}

async function next_turn() {
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            let success = false;
            let retries = 5, wait_length = 3000;
            while (!success && retries--) {
                try {
                    var response = await fetch(`/api/games/${game_id}/new_turn`, {
                        method: 'POST',
                    })
                    response = await response.json()
                    console.log(response);
                    success = response.success;

                    if (success) {
                        const current_game_stats = await response.updated_game_state;
                        await update_new_game_stats(current_game_stats);
                        await update_progress_bars(current_game_stats);
                    }
                    console.log("TURN ADVANCED SUCCESSFULLY");
                    resolve(`{"status": "Turn advanced successfully", "value": 100}`)
                } catch (err) {
                    console.log("Error while computing next game turn's variables:", err);
                } finally {
                    if (!success) {
                        console.log(`Trying fetching from /api/games/${game_id}/new_turn in ${wait_length / 1000} seconds.`)
                        await timer(wait_length);
                    }
                }
            }
            console.log(`--------------------------------------------------------`)
            resolve();
        })
    })
}

async function update_new_game_stats(stats) {
    console.log("UPDATING GAME STATS...")
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            const game_turn = document.querySelector("#game-turn")
            const game_money = document.querySelector("#game-money")
            const game_inf_airports = document.querySelector("#game-inf-airports");


            game_turn.innerText = stats.game_turn;
            game_money.innerText = stats.money;


            let retries = 3, success = false, wait_length = 3000;

            var game_inf_airports_num = 0;


            while (!success && retries--) {
                try {
                    let game_airports_info = await fetch(`/api/airports/${game_id}`);
                    game_airports_info = await game_airports_info.json();
                    success = game_airports_info.success;
                    if (success) {
                        let game_airports_list = game_airports_info.airports;
                        console.log(game_airports_list);
                        for (let i = 0; i < game_airports_list.length; i++) {
                            if (game_airports_list[i].infected === true) {
                                console.log(`AIRPORT ${i} is infected`)
                                game_inf_airports_num++;
                                all_airports.airports[i].infected = true;
                            }
                            if (game_airports_list[i].closed === true) {
                                all_airports.airports[i].closed = true;
                            }
                        }
                    }
                } catch (err) {
                    console.log(`ERROR while fetching from /api/airports/${game_id}: ${err}`);

                } finally {
                    if (!success) {
                        console.log(`Trying fetching from /api/airports/${game_id} again in ${wait_length / 1000} seconds.`);
                        await timer(wait_length);
                    } else {
                        game_inf_airports.innerText = game_inf_airports_num;
                        break;
                    }
                }
            }
            resolve();
        })
    })
}

async function update_progress_bars(stats) {
    console.log(`UPDATING PROGRESS BARS`);
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            const dis_progress = document.querySelector("#dis-progress");
            dis_progress.style.width = stats.public_dissatisfaction + '%';

            const cure_progress = document.querySelector("#cure-progress");
            cure_progress.style.width = stats.research_progress + '%';

            const inf_progress = document.querySelector("#inf-progress");
            inf_progress.style.width = stats.infected_population + '%';
        })
        resolve();
    })
}
// start_game();

// The popup function
function popup(s) {
    const popupDiv = document.createElement('div');

    popupDiv.textContent = s;

    Object.assign(popupDiv.style, {
        position: 'fixed',
        top: '20%', 
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px',
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        opacity: '0',
        transition: 'opacity 1s ease-in-out, transform 1s ease-in-out',
        zIndex: '1000'
    });

    document.body.appendChild(popupDiv);

    setTimeout(() => {
        popupDiv.style.opacity = '1';
        popupDiv.style.transform = 'translate(-50%, -60%)'; 
    }, 10); 

    setTimeout(() => {
        popupDiv.style.opacity = '0';
        popupDiv.style.transform = 'translate(-50%, -70%)'; 

        setTimeout(() => {
            popupDiv.remove();
        }, 1000);
    }, 3000);
}

async function place_markers() {
    console.log(`Place_markers`);
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            const markers = L.featureGroup().addTo(map)

            for (let i = 0; i < all_airports.airports.length; i++) {
                let icao = all_airports.airports[i].airport_id

                let retries = 3, seconds = 3000, success = false;
                while (!success && retries--) {
                    try {
                        var airport_info = await fetch(`/api/airports/info/${icao}`)
                        airport_info = await airport_info.json()
                        success = airport_info.success;
                        console.log(success)
                    } catch (err) {
                        console.log(`Fetch airport ${icao} data failed: ${err}`);
                        console.log(`Trying again after ${seconds}.`)
                    } finally {
                        if (!success) {
                            console.log(`Trying to fetch from /api/airports/info/${icao} again in ${seconds / 1000} seconds.`);
                            await timer(seconds);
                        }
                    }
                }
                let log = airport_info.airport.longitude_deg
                let lat = airport_info.airport.latitude_deg
                const marker = L.marker([lat, log]).addTo(map)
                marker._icon.classList.add(`huechange${i}`);
                markers.addLayer(marker)
                map.setView([lat, log])

                //makes pins clickable
                const placeName = document.createElement("h3")
                placeName.innerText = airport_info.airport.name

                const placeIcao = document.createElement('p')
                placeIcao.innerText = icao

                const article = document.createElement("article")

                article.appendChild(placeName)
                article.appendChild(placeIcao)
                marker.bindPopup(article)
            }
            resolve();
        })
    })
}

async function recolor_map_pins() {
    console.log("RECOLORING...");
    return new Promise(async function (resolve) {
        console.log(all_airports);
        setTimeout(async function () {

            for (let i = 0; i < all_airports.airports.length; i++) {
                // Get all elements with the class 'huechange'
                let pin = document.getElementsByClassName(`huechange${i}`)[0];
                let airport_infected = all_airports.airports[i].infected;
                let airport_closed = all_airports.airports[i].closed;
                // if(airport_infected || airport_closed) console.log(`Airport ${i} is now --- Infected: ${airport_infected} --- Closed: ${airport_closed}`)
                // Check if there are any elements

                // Apply the appropriate filter based on infection status
                if (!airport_infected && !airport_closed) {
                    pin.style.filter = 'hue-rotate(300deg)'; //green
                } else if (airport_closed) {
                    pin.style.filter = 'hue-rotate(180deg)'; //red
                } else if (airport_infected) {
                    pin.style.filter = 'hue-rotate(122deg)'; //yellow
                }
            }
        })
        resolve();
    })
}

async function randomEvent() {
    return new Promise(async function (resolve) {
        setTimeout(async function () {
            let retries = 5, seconds = 2000;
            try {
                let success = false;
                while (!success && retries--) {
                    let response = await fetch(`/api/games/${game_id}/random_event`, {
                        method: 'POST',
                        body: {},
                        headers: {}
                    })

                    let status = response.status;
                    response = await response.json();
                    success = response.success;

                    console.log(status, success, response)

                    if (status === 201) {
                        // alert(response.event.description)
                        popup(response.event.description)
                        // popup(`Lucky for you, nothing happened.`)
                    }
                    if (status === 500 || status === 400) {
                        console.log(`Random event failed: ${response.message}`);
                    }
                    if (status === 200 && !success) {
                        console.log("RANDOM EVENTN'T")
                        resolve();
                    } else if (status === 200 && success) {
                        // alert(response.event.description)
                        popup(response.event.description);
                        resolve();
                    }
                }
            } catch (err) {
                console.log(err);
                await timer(seconds);
            }
            resolve();
        })
    })
}

async function gameLoop() {
    /* 
    Holds all of the real-time game functionality 
    Each turn consists of 3 basic phase : 
    - Choices phase : Player makes choice 
    - Active phase : The game process said choice and change the game's statistics
    accordingly
    - Passive phase : The GeminiAI will decide if this round will occur a
    random events or not and said event will be generated by the AI.
    */
    console.log("Now inside GameLoop");
    await gameInitialize();
    await place_markers();
    await recolor_map_pins();

    while (true) {
        await timer(3000);
        await recolor_map_pins();
        await renderChoice()
            .then(getUserChoice)
            .then(randomEvent)
            .then(spreadDisease)
            .then(next_turn);

        let game_over = await end_game();
        console.log(game_over);
        if (game_over[0]) {
            alert(game_over[1]);
            window.location.href = '/';
            break;
        }

    }


    // let all_choices = await renderChoice(); // Choices phase
    // let user_choice = await getUserChoice()
}


gameLoop()

