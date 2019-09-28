
const {remote} = require('electron');
const Store = require('electron-store');
const config = new Store();
const cStruct = (...keys) => ((...v) => keys.reduce((o, k, i) => {
    o[k] = v[i];
    return o
}, {}))
const hFeature_t = cStruct('name', 'hotkey', 'value', 'valueStr', 'container', 'updated')
class RoboHack {
    constructor() {
        this.app;
        this.socket;
        this.network;
        this.player;
        this.character;
        this.controls;
        this.teleport;
        this.screen;
        this.texture;
        this.killTimer = false;
        this.features = [];
        this.onLoad();
    }

    onLoad() {
        app.settings.quality = 1;
        app.settings.fov = 100;
        this.createFeatureInfo();
        this.features.push(hFeature_t('FullClip', 'M', -1, null, [], true));
        this.features.push(hFeature_t('GodMode', 'G', -1, null, [], true));
        this.features.push(hFeature_t('SpeedHack', 'N', -1, null, [], true));
        this.features.push(hFeature_t('AutoKill', 'K', -1, null, ['Off', 'Raycast', 'Nuke', 'Score'], true));
    }

    featureUpdated(feature) {
        if ("undefined" != typeof config) config.set(game_prefix + "_feature" + feature.name, feature.value);
        if (feature.name == 'AutoKill') {
            this.killTimer = false;
            setTimeout(() => {
                this.killTimer = true
            }, 5000);
        }
        this.updateFeatureInfo();
    }

    onTick() {
        this.features.forEach((feature, index, array) => {
            // On Updated State
            if (feature.updated) {
                feature.updated = false;
                if (feature.container.length) {
                    if (feature.value === -1) {
                        feature.value = "undefined" != typeof config ? config.get(game_prefix + "_feature" + feature.name, null) : 0;
                    } else {
                        feature.value += 1;
                        if (feature.value > feature.container.length - 1)
                            feature.value = 0;
                    }
                    feature.valueStr = feature.container[feature.value];
                } else {
                    if (feature.value === -1) {
                        feature.value = "undefined" != typeof config ? config.get(game_prefix + "_feature" + feature.name, null) : 0;
                    } else
                        feature.value ^= 1;
                    feature.valueStr = feature.value ? "true" : "false";
                }
                var t = {
                    name: feature.name,
                    value: feature.value
                };
                this.featureUpdated(feature);
            }
            // OnTick State
            switch (feature.name) {
                case 'GodMode':
                    if (feature.value && this.character && this.character.health < 100) {
                        var weapon = this.character.weaponId ? this.character.weaponId : "ar105";
                        this.socket.send(this.network.code.respawn + ";" + this.cleanStr(JSON.stringify([weapon])));
                    }
                    break;
                case 'FullClip':
                    if (feature.value) this.app.weapon.clip < this.app.currentWeapon.capacity ? this.app.weapon.clip = this.app.currentWeapon.capacity : 0;
                    break;
                case 'SpeedHack':
                    this.character.game.speed = feature.value ? 2.5 : 1;
                    break;
                case 'AutoKill':
                if (this.killTimer && feature.value > 0)
                    this.AutoKill(feature.value);
                    break;
            }
        });
    }

    onKeyUp(event) {
        if ("INPUT" == document.activeElement.tagName) return;
        const key = event.key.toUpperCase();
        this.features.forEach((feature, index, array) => {
            feature.updated = feature.hotkey.toUpperCase() === key;
        });
        if (document.activeElement.tagName !== "INPUT") {
            if ('0' === key) {
                const menu = document.getElementById("featuresInfoBox");
                if (menu) {
                    menu.style.display = !menu.style.display || menu.style.display === "inline-block" ? "none" : "inline-block";
                }
            } else {
                this.features.forEach((feature, index, array) => {
                    feature.updated = feature.hotkey.toUpperCase() === key;
                });
            }
        }
    }

    onKeyDown(event) {
        if ("INPUT" == document.activeElement.tagName) return;
        const key = event.key.toUpperCase();
        switch(key) {
            case 'J': this.socket.send(this.network.code.damage + ";" + this.cleanStr(JSON.stringify([this.network.properties.hash, this.network.properties.hash, 1, 1]))); break;
            case 'P': app.findMatch(); break;
            case 'DECIMAL': network.inputs.jump = 1;
        }
    }

    onMouseScroll(direction) {

    }

    AutoKill(value) {
        switch (value) {
            case 1: {
                /*RayCast*/
                const hitboxes = this.controls.raycaster.intersectObjects(game.hitboxes.children);
                if (hitboxes.length > 0) {
                    if (!this.controls.mouse.focus)
                        this.controls.weaponFocus(!0);
                    else if (hitboxes[0].object.hash !== this.network.properties.hash)
                        this.controls.registerShot(hitboxes[0].object.hash, this.network.properties.hash, 100, 1);
                }
                else if (this.controls.mouse.focus) this.controls.weaponFocus(!1);
            } break;
            case 2: {
                /*Nuke*/
                const enemies = this.character.game.players.filter(x => x.distance !== 0).filter(x => x.health > 0);
                enemies.forEach((cunt, index, array) => {this.controls.registerShot(cunt.hash, this.network.properties.hash, cunt.health, 1);});
            } break;
            case 3: {
                /*Score Hack*/
                const players = this.character.game.players.filter(x => x.health > 0).sort(function(a, b) {return a.distance - b.distance});
                players.forEach((player, index, array) => {this.socket.send(this.network.code.damage + ";" + this.cleanStr(JSON.stringify([player.hash, this.network.properties.hash, 1, 1])));});
            } break;
        }
    }

    getFeatureName(str) {
        return str.replace(/([A-Z])/g, (match) => match).replace(/^./, (match) => match.toUpperCase());
    }

    createFeatureInfo() {
        const infoBox = document.createElement('div');
        infoBox.innerHTML = '<div> <style> #featuresInfoBox { text-align: left; width: 190px; z-index: 3; padding: 10px; padding-left: 20px; padding-right: 20px; color: rgba(255, 255, 255, 0.7); line-height: 30px; margin-top: 136px; background-color: rgba(0, 0, 0, 0.2); } #featuresInfoBox .featuresTitle { font-size: 18px; font-weight: bold; text-align: center; color: #fff; margin-top: 5px; margin-bottom: 5px; } #featuresInfoBox .featureItem { font-size: 15px; } </style> <div id="featuresInfoBox"></div>'.trim();  
        const benchmarkChild = document.getElementsByClassName("benchmark")[0];
        const benchmarkDisplay = benchmarkChild.parentNode;  
        benchmarkDisplay.insertBefore(infoBox.firstChild, benchmarkDisplay.nextSibling);
        //benchmarkChild.parentNode.removeChild(benchmarkChild);
        //benchmarkChild.parentNode.replaceChild(el, benchmarkChild);
    }

    updateFeatureInfo() {
        const title = "Robo Hack - " + remote.app.getVersion();
        const infoBox = document.querySelector('#featuresInfoBox');
        if (infoBox === null) {
            return;
        }
        const lines = this.features.map(feature => {
            return '<div class="featureItem"> [' + feature.hotkey.toUpperCase() + ']' + this.getFeatureName(feature.name) + ' - ' + feature.valueStr + '</div>';
        });
        infoBox.innerHTML = '<div class="featuresTitle">' + title + '</div>' + lines.join('').trim();
    }

    cleanStr(str) {
        return str.replace(/;/g, "")
    }

    sendMessage(msg, from = 0, team = 0) {
        this.network.setMessage([from, team, msg]);
        setTimeout(() => {
            this.app.chat.pop();
        }, 5000);
    }
};

window.addEventListener("wheel", function(e) {
    const dir = Math.sign(e.deltaY);
    window.roboHack.onMouseScroll(dir);
});