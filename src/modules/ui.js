import { $, appendListItems, openTab, doubleTap, getAppSelection, canSendToFirebase } from "./utils.js";
import {
    getData,
    setData,
    loadData,
    setDataCallbacks,
    setWeekDay,
} from "./data.js";
import { selectAdminMeal, getAdminMealOptions, setAdminMealOptions, fillAdminOptGroups, initAdminMeals } from "./admin-meals.js";
import { setAdminMeatTypes, selectAdminMeatType, initAdminMeatTypes } from "./admin-meat-types.js";
import { setAdminMealTypes, selectAdminMealType, initAdminMealTypes } from "./admin-meal-types.js";
import { initAdminMealSuggestions } from "./admin-meal-suggestions.js";

let appDay;
let appWeek;
let mainFilteredOptions = [];

function updateWeekSuggestionTooltips(suggestions = {}) {
    const normalizedSuggestions =
        suggestions && typeof suggestions === "object" ? suggestions : {};

    document.querySelectorAll(".week").forEach((el) => {
        const dayKey = String(el.dataset.day || "").toLowerCase();
        const matchedKey = Object.keys(normalizedSuggestions).find(
            (key) => key.toLowerCase() === dayKey
        );
        const value = matchedKey ? normalizedSuggestions[matchedKey] : "";

        el.dataset.suggestions = typeof value === "string" ? value : "";
    });
}

function selectDayMeal(e) {
    const selection = getAppSelection(e);
    appDay = selection.appDay;
    appWeek = selection.appWeek;

    document.querySelectorAll(".weekView").forEach((el) => {
        if (el.id.includes(appWeek)) {
            el.firstElementChild.style.background =
                // "linear-gradient(180deg, rgba(30,144,255,1) 0%, rgba(138,197,255,1) 100%)";
                "linear-gradient(180deg, #55965B 0%, #6EC175 100%)";
        } else {
            el.firstElementChild.style.background =
                "linear-gradient(to bottom, #868f96 0%, #596164 100%)";
        }
    });

    document.querySelectorAll(".week").forEach((el) => {
        if (el.dataset.day == appDay && el.dataset.week == appWeek) {
            el.classList.add("timeSelected");
        } else {
            el.classList.remove("timeSelected");
        }
    });

    document.querySelectorAll(".meal").forEach((el) => {
        if (el.dataset.day == appDay && el.dataset.week == appWeek) {
            el.classList.add("timeSelected");
            el.children.item(1).classList.add("showMealBackSpace");
        } else {
            el.classList.remove("timeSelected");
            el.children.item(1).classList.remove("showMealBackSpace");
        }
    });
}

function saveOnline(val) {
    if (!canSendToFirebase()) {
        return false;
    }

    const meal = val;
    const day = appDay;
    const week = appWeek;

    if (meal == undefined || day == undefined || week == undefined) return false;

    setWeekDay(week, day, meal)
        .then(() => {
            $(`[data-day=${ day }][data-week=${ week }][data-type="meal"] .mealData`).innerHTML = meal;
        })
        .catch((error) => {
            console.error(error);
        });

    return true;
}

function dropZone(e) {
    let parent = [...document.querySelectorAll(".mealList")].filter((el) => {
        return el.contains(e.target);
    })[0];

    return [...parent.children].filter((el) => el.contains(e.target) || el == e.target)[0];
}

function drop(e) {
    if (!canSendToFirebase()) {
        return;
    }

    let timeArr = ["previous", "current", "next"];

    let dropWeek = dropZone(e).dataset.week;
    let dropDay = dropZone(e).dataset.day;
    let dragData = JSON.parse(e.dataTransfer.getData("text/plain"));

    let dragWeek = dragData.week;
    let dragDay = dragData.day;

    let dropEl = document.querySelector(
        `[data-day=${ dropDay }][data-week=${ dropWeek }][data-type="meal"]`
    );
    let dragEl = document.querySelector(
        `[data-day=${ dragDay }][data-week=${ dragWeek }][data-type="meal"]`
    );

    let clone = dragEl.cloneNode(true);

    dragEl.innerHTML = dropEl.innerHTML;
    dropEl.innerHTML = clone.innerHTML;

    dragEl.querySelector(".mealBackSpace").addEventListener("click", (e) => {
        e.target.previousElementSibling.innerHTML = "&nbsp;";
        saveOnline("&nbsp;");
    });

    dropEl.querySelector(".mealBackSpace").addEventListener("click", (e) => {
        e.target.previousElementSibling.innerHTML = "&nbsp;";
        saveOnline("&nbsp;");
    });

    if (clone.dataset.id !== dragData) {
        function createObj(time) {
            let obj = {};
            let weekArr = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ];
            weekArr.forEach((day) => {
                let txtVal = document.querySelector(
                    `[data-day=${ day }][data-week=${ time }][data-type="meal"] .mealData`
                ).innerText;
                obj[day] = txtVal;
            });
            return obj;
        }

        timeArr.forEach((time) => {
            setData(time, createObj(time));
        });
    }
}

function addListeners(el) {
    el.addEventListener("click", () => {
        $("#mealOptions").value = "";
    });
    el.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone(e).classList.add("dragActive");
    });
    el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                day: dropZone(e).dataset.day,
                week: dropZone(e).dataset.week,
            })
        );
    });
    el.addEventListener("dragleave", (e) => {
        dropZone(e).classList.remove("dragActive");
    });
    el.addEventListener("dragend", (e) => {
        dropZone(e).classList.remove("dragActive");
    });
    el.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone(e).classList.remove("dragActive");
        drop(e);
    });
    el.querySelector(".mealBackSpace").addEventListener("click", (e) => {
        saveOnline("&nbsp;");
    });
}

function areAllChecked(arr) {
    let isChecked = arr.filter((el) => el.checked);
    switch (isChecked.length) {
        case arr.length:
            $("#showAllMeals").classList.add("highlightBtn");
            $("#resetFilters").classList.remove("highlightBtn");
            $("#customFilter").classList.remove("highlightBtn");
            break;

        case 0:
            $("#showAllMeals").classList.remove("highlightBtn");
            $("#resetFilters").classList.add("highlightBtn");
            $("#customFilter").classList.remove("highlightBtn");
            break;

        default:
            $("#showAllMeals").classList.remove("highlightBtn");
            $("#resetFilters").classList.remove("highlightBtn");
            $("#customFilter").classList.add("highlightBtn");
            break;
    }
}

function fillOptGroups(uniqueMeats, uniqueMealTypes) {
    $("#meatTypeOptions").innerHTML = ``;
    $("#mealTypeOptions").innerHTML = ``;

    let g1 = `<div class='optTitle'>Meat Type</div>`;
    $("#meatTypeOptions").innerHTML = g1;

    uniqueMeats.forEach((el) => {
        let label = document.createElement("label");
        label.innerHTML = `<input name="foodFilter" value='${ "1." + el }' type='checkbox'/> ${ el }`;
        label.className = "itemOption";
        $("#meatTypeOptions").append(label);
    });

    let g2 = `<div class='optTitle'>Meal Type</div>`;
    $("#mealTypeOptions").innerHTML = g2;

    uniqueMealTypes.forEach((el) => {
        let label = document.createElement("label");
        label.innerHTML = `<input name="foodFilter" value='${ "2." + el }' type='checkbox'/> ${ el }`;
        label.className = "itemOption";
        $("#mealTypeOptions").append(label);
    });

    $("#close_filterOptionsPanel").addEventListener("click", () => {
        $("#filterOptionsPanel").classList.remove("showFilters");
    });

    document.getElementsByName("foodFilter").forEach((el, i, arr) => {
        el.addEventListener("change", () => {
            let checkedEl = [];
            for (const input of arr) {
                if (input.checked) {
                    checkedEl.push(input);
                }
            }
            filterBy(checkedEl);
            areAllChecked([...arr]);
        });
    });

    $("#resetFilters").addEventListener("click", (e) => {
        document.getElementsByName("foodFilter").forEach((el) => {
            el.checked = false;
        });
        $("#mealOptions").value = "";
        filterSearch($("#mealOptions"), $("#mainList"), []);
        areAllChecked([...document.getElementsByName("foodFilter")]);
    });
}

function filterBy(mealFilter) {
    function theFilter(str) {
        let type = str.split(".");
        let filtered;
        switch (+type[0]) {
            case 1:
                filtered = showFilteredByMeat(type[1]);
                break;

            case 2:
                filtered = showFilteredByMealType(type[1]);
                break;

            default:
                console.error(+type[0]);
                break;
        }

        return filtered;
    }

    let filterOptions = [];
    let filteredValues = [];

    for (const mealType of mealFilter) {
        filterOptions.push(mealType.value);
    }

    filterOptions.forEach((el) => {
        filteredValues.push(theFilter(el));
    });

    Promise.all(filteredValues).then((rs) => {
        mainFilteredOptions = [...new Set(rs.flat(1))];
        filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
    });
}

function appendListItemsFor(listParent, filteredList) {
    appendListItems(listParent, filteredList, (e) => {
        switch (listParent.id) {
            case "mainList":
                updateMainList(e);
                break;
            case "editMealList":
                selectAdminMeal(e.target.innerText);
                break;
            case "editMealTypeList":
                selectAdminMealType(e.target.innerText);
                break;
            case "editMeatTypeList":
                selectAdminMeatType(e.target.innerText);
                break;
            default:
                break;
        }
    });
}

function filterSearch(searchBox, listParent, listArr) {
    let searchTerm = searchBox.value;
    if (searchTerm == "") {
        appendListItemsFor(listParent, listArr);
    } else {
        let regex = new RegExp(searchTerm, "gi");
        let filteredList = listArr.filter((item) => {
            return item.match(regex) != null;
        });
        appendListItemsFor(listParent, filteredList);
    }
}

function loadFilterOptions() {
    getData("meals").then(async (rs) => {
        const mealTypeValue = (await getData("mealTypes")) || "";
        const meatTypeValue = (await getData("meatTypes")) || "";
        let mealTypes = mealTypeValue ? mealTypeValue.split(",").sort() : [];
        let meatTypes = meatTypeValue ? meatTypeValue.split(",").sort() : [];

        let meals = rs.map((el) => el[1]);
        mainFilteredOptions = meals;
        setAdminMealOptions(meals);
        setAdminMeatTypes(meatTypes);
        setAdminMealTypes(mealTypes);

        fillOptGroups(meatTypes, mealTypes);
        fillAdminOptGroups(meatTypes, mealTypes);
        filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
        filterSearch($("#editMealSearch"), $("#editMealList"), getAdminMealOptions());
        showAllMeals();
    });
}

function showAllMeals() {
    getData("meals").then((rs) => {
        let allMeals = [...rs.map((el) => el[1])];

        document
            .querySelectorAll(".itemOption input[type=checkbox]")
            .forEach((el) => {
                el.checked = true;
            });
        $("#mealOptions").value = "";
        filterSearch($("#mealOptions"), $("#mainList"), allMeals);
        areAllChecked([...document.getElementsByName("foodFilter")]);
    });
}

async function showFilteredByMeat(meatFilter) {
    return getData("meals").then((rs) => {
        return [
            ...new Set(
                rs
                    .filter((el) => {
                        return el[0] == meatFilter;
                    })
                    .map((el) => {
                        return el[1];
                    })
            ),
        ];
    });
}

async function showFilteredByMealType(mealTypeFilter) {
    return getData("meals").then((rs) => {
        return [
            ...new Set(
                rs
                    .filter((el) => {
                        return el[3] == mealTypeFilter;
                    })
                    .map((el) => {
                        return el[1];
                    })
            ),
        ];
    });
}

function updateMainList(value) {
    // If called with an Event from calendar, use it to update selection; otherwise assume `value` is the meal text.
    if (value && value.target && value.target.dataset && value.target.dataset.day) {
        const selection = getAppSelection(value);
        appDay = selection.appDay;
        appWeek = selection.appWeek;
    }

    if (value && value.target) {
        value = value.target.innerText;
    }

    if (!appDay || !appWeek) {
        alert("Please select a week-day first!");
        $("#mainList").classList.remove("showList");
        return;
    }

    let selectedSlot = document.querySelector(
        `[data-day=${ appDay }][data-week=${ appWeek }][data-type='meal'] .mealData`
    );

    if (!selectedSlot) {
        alert("Please select a week-day first!");
        $("#mainList").classList.remove("showList");
        return;
    }

    $("#mainList").classList.remove("showList");
    saveOnline(value);
}

export async function initUI() {
    setDataCallbacks({
        onWeekUpdated: (weekData) => {
            if (weekData && weekData.previous) {
                // full week object came through
                const weeks = weekData;
                Object.entries(weeks.previous || {}).forEach(([day, value]) => {
                    const el = document.querySelector(
                        `[data-day=${ day }][data-week="previous"][data-type="meal"] .mealData`
                    );
                    if (el) el.innerHTML = value;
                });
                Object.entries(weeks.current || {}).forEach(([day, value]) => {
                    const el = document.querySelector(
                        `[data-day=${ day }][data-week="current"][data-type="meal"] .mealData`
                    );
                    if (el) el.innerHTML = value;
                });
                Object.entries(weeks.next || {}).forEach(([day, value]) => {
                    const el = document.querySelector(
                        `[data-day=${ day }][data-week="next"][data-type="meal"] .mealData`
                    );
                    if (el) el.innerHTML = value;
                });
            } else if (weekData && weekData.week) {
                // single day update
                const { week, day, val } = weekData;
                const el = document.querySelector(
                    `[data-day=${ day }][data-week=${ week }][data-type="meal"] .mealData`
                );
                if (el) el.innerHTML = val;
            }
        },
        onSuggestionsUpdated: (suggestions) => {
            updateWeekSuggestionTooltips(suggestions);
        },
    });

    // Wire up DOM events
    $("#shiftWeeks").addEventListener("click", () => {
        if (!canSendToFirebase()) {
            return;
        }

        if (!confirm("You are about to shift. Confirm?")) return;

        const current = getData("current");
        const next = getData("next");

        Promise.all([current, next])
            .then((values) => {
                let obj = {
                    Sunday: "&nbsp;",
                    Monday: "&nbsp;",
                    Tuesday: "&nbsp;",
                    Wednesday: "&nbsp;",
                    Thursday: "&nbsp;",
                    Friday: "&nbsp;",
                    Saturday: "&nbsp;",
                };

                return Promise.all([
                    setData("previous", values[0]),
                    setData("current", values[1]),
                    setData("next", obj),
                ]);
            })
            .then(() => {
                alert("All Weeks shifted!");
                $("#settingsPanel").classList.remove("showSettings");
            });
    });

    $("#open_settingsPanel").addEventListener("click", () => {
        $("#settingsPanel").classList.add("showSettings");
        $("#mainPanel").style.filter = "blur(7px)";
        $("#mainPanel").style.pointerEvents = "none";
    });

    $("#close_settingsPanel").addEventListener("click", () => {
        $("#settingsPanel").classList.remove("showSettings");
        $("#mainPanel").style.filter = "none";
        $("#mainPanel").style.pointerEvents = "auto";
    });

    $("#mealFilter").addEventListener("click", () => {
        $("#filterOptionsPanel").classList.toggle("showFilters");
    });

    document.querySelectorAll(".meal").forEach((el) => {
        el.setAttribute("draggable", true);
        addListeners(el);
        el.addEventListener("click", (e) => {
            selectDayMeal(e);
        });
    });

    document.querySelectorAll(".maTab").forEach((el) => {
        el.addEventListener("click", (e) => {
            openTab(e);
        });
    });

    document.querySelectorAll(`[data-type="meal"]`).forEach((el) => {
        el.addEventListener("dblclick", (e) => {
            e.preventDefault();
            doubleTap();
        });
    });

    document.addEventListener("visibilitychange", function () {
        loadData();
    });

    document.querySelectorAll(".menuBtn").forEach((el) => {
        el.addEventListener("click", (e) => {
            let tab = e.target.dataset.tab;
            if (e.target !== $("#navContainer>div:nth-child(1)")) {
                $("#dropContainer").classList.remove("drop");
            }

            if (tab == 0 || tab == 1 || tab == 2 || tab == 3) {
                $(".tab:nth-child(1)").classList.add("activeTab");
            }
        });
    });

    document.querySelectorAll(".tab").forEach((tab, _i, arr) => {
        tab.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
        tab.addEventListener("click", (e) => {
            if (e.target.parentNode == tab) return;

            let tData = e.target.dataset.tab;
            switch (Number(tData)) {
                case 0:
                    $("#activeOptions").innerHTML = "Meals";
                    break;

                case 1:
                    $("#activeOptions").innerHTML = "Meal Types";
                    break;

                case 2:
                    $("#activeOptions").innerHTML = "Meat Types";
                    break;

                case 3:
                    $("#activeOptions").innerHTML = "Meal Suggestions";
                    break;

                case 4:
                    $("#activeOptions").innerHTML = "Options";
                    break;

                case 5:
                    $("#activeOptions").innerHTML = "About";
                    break;

                default:
                    break;
            }

            arr.forEach((el) => {
                if (
                    el != e.target &&
                    tData != 0 &&
                    tData != 1 &&
                    tData != 2 &&
                    tData != 3
                ) {
                    el.classList.remove("activeTab");
                } else {
                    tab.classList.add("activeTab");
                }
            });

            let tabNum = +e.target.dataset.tab;
            if (isNaN(tabNum)) {
                $("#dropContainer").classList.toggle("drop");
                return;
            } else {
                $("#dropContainer").classList.remove("drop");
            }

            document.querySelectorAll(".tabContainer").forEach((container, j) => {
                if (j !== tabNum) {
                    container.classList.remove("activeTabContainer");
                } else {
                    container.classList.add("activeTabContainer");
                }
            });
        });
    });

    document.querySelectorAll(".backspace").forEach((el) => {
        el.addEventListener("click", () => {
            el.previousElementSibling.value = "";
            el.previousElementSibling.focus();
        });
    });

    document.querySelectorAll(".adminBackSpace").forEach((el) => {
        el.addEventListener("click", () => {
            el.previousElementSibling.value = "";
            el.previousElementSibling.focus();
        });
    });

    $("#mealOptions").addEventListener("focus", () => {
        filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
        $("#mainList").classList.add("showList");
        $("#filterOptionsPanel").classList.remove("showFilters");
    });

    $("#mealOptions").addEventListener("input", () => {
        filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
    });

    $("#mainListDropDown").addEventListener("click", (e) => {
        const willShow = !$("#mainList").classList.contains("showList");
        e.target.style.setProperty('--toggleIcon', willShow ? '"\ue5ce"' : '"\ue5cf"');
        $("#mainList").classList.toggle("showList");
        if ($("#mainList").classList.contains("showList")) {
            filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
        }
        $("#filterOptionsPanel").classList.remove("showFilters");
    });

    document.querySelectorAll(".listItems").forEach((el) => {
        el.addEventListener("click", () => {
            el.classList.remove("showList");
        });
    });

    document.querySelectorAll(".adminListItems").forEach((el) => {
        el.addEventListener("click", () => {
            el.classList.remove("showAdminList");
        });
    });

    $("#showAllMeals").addEventListener("click", () => {
        showAllMeals();
    });

    initAdminMeals(filterSearch, loadFilterOptions);
    initAdminMeatTypes(filterSearch, loadFilterOptions);
    initAdminMealTypes(filterSearch, loadFilterOptions);
    initAdminMealSuggestions();
    updateWeekSuggestionTooltips();
}
