// Utility functions used throughout the app.

// Simple DOM selector helper.
export const $ = (sel) => document.querySelector(sel);

// Expose `$` globally for legacy code.
window.$ = $;

export const firebaseOfflineMessage = "This device is currently offline. You may resume once a data connection is established.";

export function validInput(msgEl, userInput) {
    const regex = /[^ a-zA-Z0-9]/gim;
    if (regex.exec(userInput)) {
        statusMessage(msgEl, "Only alpha-numeric and space characters are allowed.");
        return false;
    } else {
        return true;
    }
}

let msgInProgress = false;

export async function statusMessage(element, msg) {
    function timer(action, ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                action();
                resolve();
            }, ms);
        });
    }

    if (msgInProgress) return;
    msgInProgress = true;
    element.parentElement.style.display = "flex";

    await timer(() => {
        element.innerText = msg;
        element.classList.add("msgFlash");
    }, 100);

    await timer(() => {
        element.classList.remove("msgFlash");
    }, 2200);

    await timer(() => {
        element.parentElement.style.display = "none";
    }, 550);

    msgInProgress = false;
}

export function canSendToFirebase(statusElement) {
    if (navigator.onLine) {
        return true;
    }

    if (statusElement) {
        statusMessage(statusElement, firebaseOfflineMessage);
    } else {
        alert(firebaseOfflineMessage);
    }

    return false;
}

export function appendListItems(listParent, filteredList, onClick) {
    listParent.innerHTML = "";
    filteredList.forEach((item) => {
        let opt = document.createElement("div");
        opt.className = "itemOption";
        opt.innerText = item;

        if (typeof onClick === "function") {
            opt.addEventListener("click", (e) => onClick(e));
        }

        listParent.append(opt);
    });
}

export function openTab(e) {
    document.querySelectorAll(".tab").forEach((el) => {
        el.classList.remove("active");
    });

    document.querySelectorAll(".tabBtn").forEach((el) => {
        el.classList.remove("activeTabBtn");
    });

    // Show the selected tab
    const tabContent = document.getElementById(e.target.dataset.tab);
    tabContent.classList.add("active");
    e.target.classList.add("activeTabBtn");
}

export function doubleTap() {
    document.querySelectorAll(".tabContainer").forEach((container, i) => {
        if (i !== 0) {
            container.classList.remove("activeTabContainer");
        } else {
            container.classList.add("activeTabContainer");
        }
    });

    $("#settingsPanel").classList.add("showSettings");
    document.querySelector(`[data-tab="menu"]`).classList.add("activeTab");
    $("#activeOptions").innerHTML = "Meals";
}

export function getAppSelection(e) {
    let parentEl = e.target.parentElement;

    if (parentEl.className == "mealList") {
        return {
            appDay: e.target.dataset.day,
            appWeek: e.target.dataset.week,
        };
    } else if (
        [...document.querySelectorAll(".meal")].filter((el) =>
            el.contains(e.target)
        ).length > 0
    ) {
        return {
            appDay: parentEl.dataset.day,
            appWeek: parentEl.dataset.week,
        };
    }

    return { appDay: undefined, appWeek: undefined };
}
