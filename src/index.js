import * as IDB from "idb-keyval";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./assets/modules/fbconfig.js";
import { getAuth, signInAnonymously } from "firebase/auth";
import * as FB from "firebase/database";

const log = console.log.bind(console.log);
const demoVar = true;
let appDay, appWeek;
let lastAdded = Date.now();

function demo() {
  if (demoVar) {
    log(
      "Updated locally only. Online database updates are not permitted in demo mode."
    );
    return true;
  } else {
    return false;
  }
}

async function setFBWeeks() {
  if (demo()) return;
  let previous = IDB.get("previous").then((rs) => {
    return rs;
  });
  let current = IDB.get("current").then((rs) => {
    return rs;
  });
  let next = IDB.get("next").then((rs) => {
    return rs;
  });

  Promise.all([previous, current, next]).then((rs) => {
    FB.set(FB.ref(db, "weeks/previous"), rs[0]);
    FB.set(FB.ref(db, "weeks/current"), rs[1]);
    FB.set(FB.ref(db, "weeks/next"), rs[2]);
  });
}

/* Start FireBase RTDB */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = FB.getDatabase();
const mealsInfo = FB.ref(db, "meals/info");
const mealType = FB.ref(db, "meals/mealCategories");
const meatType = FB.ref(db, "meals/meatCategories");
const fbPrevious = FB.ref(db, "weeks/previous");
const fbCurrent = FB.ref(db, "weeks/current");
const fbNext = FB.ref(db, "weeks/next");
const $ = document.querySelector.bind(document);
let mainFilteredOptions = [];
let adminMealOptions = [];
let adminMeatTypes = [];
let adminMealTypes = [];
let selectedAdminMeal = {};
let deferredPrompt;
let msgInProgress = false;

// Register the service-worker for installation and caching capabilities
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((registrationError) => {
      console.log("SW registration failed: ", registrationError);
    });
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
});

async function updateIDBMeals(data, dataType) {
  let arr = [];
  await FB.get(mealsInfo)
    .then((snapshot) => {
      if (snapshot.exists()) {
        let entries = Object.entries(snapshot.val());

        entries.forEach((el, i) => {
          let innerArr = [
            el[1].meatType,
            el[1].mealName,
            el[1].meal,
            el[1].mealType,
            el[1].timestamp,
          ];
          arr.push(innerArr);
        });
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
    });
  await IDB.set("meals", arr);
  loadFilterOptions();
}

async function updateIDBMealTypes(data, eventType) {
  IDB.set("mealTypes", data);
}

async function updateIDBMeatTypes(data, eventType) {
  IDB.set("meatTypes", data);
}

/* End FireBase RTDB */

$("#shiftWeeks").addEventListener("click", () => {
  if (!navigator.onLine) {
    alert("You must be online to run the shift weeks function!");
  } else {
    if (!confirm("You are about to shift. Confirm?")) return;

    let current = IDB.get("current").then((rs) => {
      return rs;
    });

    let next = IDB.get("next").then((rs) => {
      return rs;
    });

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

        IDB.set("previous", values[0]);
        IDB.set("current", values[1]);
        IDB.set("next", obj);
      })
      .then(() => {
        setFBWeeks();
        alert("All Weeks shifted!");
        $("#settingsPanel").classList.remove("showSettings");
      });
  }
});

$("#install").addEventListener("click", () => {
  if (
    navigator.userAgent.includes("Safari") &&
    navigator.userAgent.includes("Mobile") &&
    !navigator.userAgent.includes("Android")
  ) {
    window.open(
      "https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DiOS",
      "_blank"
    );
    return;
  } else {
    deferredPrompt.prompt();
  }
});

$("#open_settingsPanel").addEventListener("click", () => {
  $("#settingsPanel").classList.add("showSettings");
});

$("#close_settingsPanel").addEventListener("click", () => {
  $("#settingsPanel").classList.remove("showSettings");
});

$("#mealFilter").addEventListener("click", () => {
  $("#filterOptionsPanel").classList.toggle("showFilters");
});

document.querySelectorAll(".meal").forEach((el) => {
  el.setAttribute("draggable", true);
  addListeners(el);
  // toggle between which day of the week is selected;
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

function doubleTap() {
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

function selectDayMeal(e) {
  getAppSelection(e);
  // necessary to set the appDay/appWeek variables;

  document.querySelectorAll(".weekView").forEach((el) => {
    if (el.id.includes(appWeek)) {
      el.firstElementChild.style.background =
        "linear-gradient(180deg, rgba(30,144,255,1) 0%, rgba(138,197,255,1) 100%)";
    } else {
      el.firstElementChild.style.background =
        "linear-gradient(180deg, rgba(62, 62, 62, 1) 0%, rgba(125, 125, 125, 1) 100%)";
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

async function saveOnline(val) {
  if (demo()) return;
  if (!navigator.onLine) {
    alert(
      "App save functionality is only available when connected to the internet."
    );
    return;
  }
  let meal = val;
  let day = appDay;
  let week = appWeek;

  if (meal == undefined || day == undefined || week == undefined) return;

  const db = FB.getDatabase();
  FB.set(FB.ref(db, `/weeks/${week}/${day}/`), meal)
    .then(() => {
      $(
        `[data-day=${day}][data-week=${week}][data-type="meal"] .mealData`
      ).innerHTML = meal;
    })
    .catch((error) => {
      console.error(error);
    });
}

function validInput(msgEl, userInput) {
  const regex = /[^ a-zA-Z0-9]/gim;
  if (regex.exec(userInput)) {
    statusMessage(
      msgEl,
      "Only alpha-numeric and space characters are allowed."
    );
    return false;
  } else {
    return true;
  }
}

function drop(e) {
  let timeArr = ["previous", "current", "next"];

  let dropWeek = dropZone(e).dataset.week;
  let dropDay = dropZone(e).dataset.day;
  let dragData = JSON.parse(e.dataTransfer.getData("text/plain"));

  let dragWeek = dragData.week;
  let dragDay = dragData.day;

  let dropEl = document.querySelector(
    `[data-day=${dropDay}][data-week=${dropWeek}][data-type="meal"]`
  );
  let dragEl = document.querySelector(
    `[data-day=${dragDay}][data-week=${dragWeek}][data-type="meal"]`
  );

  let clone = dragEl.cloneNode(true);

  dragEl.innerHTML = dropEl.innerHTML;
  dropEl.innerHTML = clone.innerHTML;

  dragEl.querySelector(".mealBackSpace").addEventListener("click", (e) => {
    // add the backspace click-handler back;
    e.target.previousElementSibling.innerHTML = "&nbsp;";
    saveOnline("&nbsp;");
  });

  dropEl.querySelector(".mealBackSpace").addEventListener("click", (e) => {
    // add the backspace click-handler back;
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
          `[data-day=${day}][data-week=${time}][data-type="meal"] .mealData`
        ).innerText;
        obj[day] = txtVal;
      });
      return obj;
    }

    timeArr.forEach((time) => {
      IDB.set(time, createObj(time)).then(() => {
        setFBWeeks();
      });
    });

    // obj = {
    //   Sunday: textContent,
    //   Monday: textContent,
    //   Tuesday: textContent,
    //   Wednesday: textContent,
    //   Thursday: textContent,
    //   Friday: textContent,
    //   Saturday: textContent,
    // };
  }
}

function dropZone(e) {
  let parent = [...document.querySelectorAll(".mealList")].filter((el) => {
    return el.contains(e.target);
  })[0];

  return [...parent.children].filter(
    (el) => el.contains(e.target) || el == e.target
  )[0];
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
    // add the backspace click-handler back;
    e.target.previousElementSibling.innerHTML = "&nbsp;";
    saveOnline("&nbsp;");
  });
}

document.addEventListener("visibilitychange", function () {
  loadData();
});

document.querySelectorAll(".menuBtn").forEach((el) => {
  el.addEventListener("click", (e) => {
    let tab = e.target.dataset.tab;
    if (e.target !== $("#navContainer>div:nth-child(1)")) {
      $("#dropContainer").classList.remove("drop");
    }

    if (tab == 0 || tab == 1 || tab == 2) {
      $(".tab:nth-child(1)").classList.add("activeTab");
    }
  });
});

document.querySelectorAll(".tab").forEach((tab, i, arr) => {
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
        $("#activeOptions").innerHTML = "Options";
        break;

      case 4:
        $("#activeOptions").innerHTML = "About";
        break;

      default:
        break;
    }

    arr.forEach((el) => {
      if (el != e.target && tData != 0 && tData != 1 && tData != 2) {
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

function loadFilterOptions() {
  IDB.get("meals").then(async (rs) => {
    let mealTypes = (await IDB.get("mealTypes")).split(",").sort();
    let meatTypes = (await IDB.get("meatTypes")).split(",").sort();

    adminMealOptions = mainFilteredOptions = rs.map((el) => el[1]);

    fillOptGroups(meatTypes, mealTypes);
    fillAdminOptGroups(meatTypes, mealTypes);
    filterSearch($("#mealOptions"), $("#mainList"), mainFilteredOptions);
    filterSearch($("#editMealSearch"), $("#editMealList"), adminMealOptions);
    showAllMeals();
  });
}

function fillAdminOptGroups(uniqueMeats, uniqueMealTypes) {
  adminMeatTypes = uniqueMeats;
  adminMealTypes = uniqueMealTypes;

  let selectedNotEmpty =
    Object.keys(selectedAdminMeal).length != 0 ? true : false;

  $("#newMeatType").innerHTML = "";
  $("#newMealType").innerHTML = "";

  adminMeatTypes.forEach((el) => {
    let selected =
      selectedNotEmpty && el == selectedAdminMeal.meatType ? true : false;
    $("#newMeatType").add(new Option(el, el, selected, selected));
  });

  adminMealTypes.forEach((el) => {
    let selected =
      selectedNotEmpty && el == selectedAdminMeal.mealType ? true : false;
    $("#newMealType").add(new Option(el, el, selected, selected));
  });
}

async function loadData() {
  await FB.get(mealsInfo)
    .then((snapshot) => {
      if (snapshot.exists()) {
        updateIDBMeals(snapshot.val(), "loaded");
      } else {
        console.log("No data available");
      }
    })

    .catch((error) => {
      console.error(error);
    });

  await FB.get(mealType)
    .then((snapshot) => {
      if (snapshot.exists()) {
        updateIDBMealTypes(snapshot.val(), "loaded");
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
    });

  await FB.get(meatType)
    .then((snapshot) => {
      if (snapshot.exists()) {
        updateIDBMeatTypes(snapshot.val(), "loaded");
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
    });

  loadFilterOptions();

  let week = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let prevObj = FB.get(fbPrevious).then((snapshot) => {
    return snapshot.val();
  });
  let currObj = FB.get(fbCurrent).then((snapshot) => {
    return snapshot.val();
  });
  let nextObj = FB.get(fbNext).then((snapshot) => {
    return snapshot.val();
  });

  Promise.all([prevObj, currObj, nextObj])
    .then((rs) => {
      IDB.set("previous", rs[0]);
      IDB.set("current", rs[1]);
      IDB.set("next", rs[2]);
    })
    .then(() => {
      IDB.get("previous").then((rs) => {
        for (const day in rs) {
          if (!week.includes(day)) return;
          document.querySelector(
            `[data-day=${day}][data-week="previous"][data-type="meal"] .mealData`
          ).innerHTML = rs[day];
        }
      });

      IDB.get("current").then((rs) => {
        let date = new Date();

        let today = week[date.getDay()];

        document.querySelectorAll("week").forEach((el) => {
          el.classList.remove("today");
        });

        $("#" + today).classList.add("today");
        for (const day in rs) {
          if (!week.includes(day)) return;
          document.querySelector(
            `[data-day=${day}][data-week="current"][data-type="meal"] .mealData`
          ).innerHTML = rs[day];
        }
      });

      IDB.get("next").then((rs) => {
        for (const day in rs) {
          if (!week.includes(day)) return;
          document.querySelector(
            `[data-day=${day}][data-week="next"][data-type="meal"] .mealData`
          ).innerHTML = rs[day];
        }
      });
    });
}

function areAllChecked(arr) {
  let isChecked = arr.filter((el) => el.checked);
  switch (isChecked.length) {
    // if ALL filter check boxes are checked...
    case arr.length:
      $("#showAllMeals").classList.add("highlightBtn");
      $("#resetFilters").classList.remove("highlightBtn");
      $("#customFilter").classList.remove("highlightBtn");
      break;
    // if NO filter checkboxes are checked...
    case 0:
      $("#showAllMeals").classList.remove("highlightBtn");
      $("#resetFilters").classList.add("highlightBtn");
      $("#customFilter").classList.remove("highlightBtn");
      break;
    // if SOME filter checkboxes are checked...
    default:
      $("#showAllMeals").classList.remove("highlightBtn");
      $("#resetFilters").classList.remove("highlightBtn");
      $("#customFilter").classList.add("highlightBtn");
      break;
  }
}

function fillOptGroups(arr1, arr2) {
  $("#meatTypeOptions").innerHTML = ``;
  $("#mealTypeOptions").innerHTML = ``;

  let g1 = `<div class='optTitle'>Meat Type</div>`;

  $("#meatTypeOptions").innerHTML = g1;

  arr1.forEach((el) => {
    let label = document.createElement("label");
    label.innerHTML = `<input name="foodFilter" value='${
      "1." + el
    }' type='checkbox'/> ${el}`;
    label.className = "itemOption";

    $("#meatTypeOptions").append(label);
  });

  let g2 = `<div class='optTitle'>Meal Type</div>`;

  $("#mealTypeOptions").innerHTML = g2;

  arr2.forEach((el) => {
    let label = document.createElement("label");
    label.innerHTML = `<input name="foodFilter" value='${
      "2." + el
    }' type='checkbox'/> ${el}`;
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

function openTab(e) {
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

document.querySelectorAll(".tabBtn").forEach((el) => {
  el.addEventListener("click", (e) => {
    openTab(e);
  });
});

function showAllMeals() {
  IDB.get("meals").then((rs) => {
    let allMeals = [
      ...rs.map((el) => {
        return el[1];
      }),
    ];

    document
      .querySelectorAll(".itemOption input[type=checkbox]")
      .forEach((el, i, arr) => {
        el.checked = true;
      });
    $("#mealOptions").value = "";
    filterSearch($("#mealOptions"), $("#mainList"), allMeals);
    areAllChecked([...document.getElementsByName("foodFilter")]);
  });
}

async function showFilteredByMeat(meatFilter) {
  return IDB.get("meals").then((rs) => {
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
  return IDB.get("meals").then((rs) => {
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

/* Populate and display custom select options for search/filter results */
function appendListItems(listParent, filteredList) {
  listParent.innerHTML = "";
  filteredList.forEach((item) => {
    let opt = document.createElement("div");
    opt.className = "itemOption";
    opt.innerText = item;

    switch (listParent.id) {
      case "mainList":
        opt.addEventListener("click", (e) => {
          updateMainList(e);
        });
        break;

      case "editMealList":
        opt.addEventListener("click", () => {
          selectAdminMeal(item);
        });
        break;

      case "editMealTypeList":
        opt.addEventListener("click", () => {
          selectAdminMealType(item);
        });
        break;

      case "editMeatTypeList":
        opt.addEventListener("click", () => {
          selectAdminMeatType(item);
        });
        break;

      default:
        break;
    }

    listParent.append(opt);
  });
}

// filter searchbox results and call appendListItems() to create the custom select list
function filterSearch(searchBox, listParent, listArr) {
  let searchTerm = searchBox.value;
  if (searchTerm == "") {
    appendListItems(listParent, listArr);
  } else {
    let regex = new RegExp(searchTerm, "gi");

    let filteredList = listArr.filter((item) => {
      return item.match(regex) != null;
    });

    appendListItems(listParent, filteredList);
  }
}

function getAppSelection(e) {
  let parentEl = e.target.parentElement;

  if (parentEl.className == "mealList") {
    appDay = e.target.dataset.day;
    appWeek = e.target.dataset.week;
  } else if (
    [...document.querySelectorAll(".meal")].filter((el) =>
      el.contains(e.target)
    ).length > 0
  ) {
    appDay = parentEl.dataset.day;
    appWeek = parentEl.dataset.week;
  }
}

function updateMainList(e) {
  getAppSelection(e);
  // necessary to set the appDay/appWeek variables;
  let selectedSlot = document.querySelector(
    `[data-day=${appDay}][data-week=${appWeek}][data-type='meal'] .mealData`
  );

  if (!selectedSlot) {
    alert("Please select a week-day first!");
    $("#mainList").classList.remove("showList");
    return;
  }
  $("#mainList").classList.remove("showList");
  selectedSlot.innerHTML = e.target.innerText;
  saveOnline(e.target.innerText);
}

function newAdminMeal() {
  if (demo()) return;
  if (!validInput($("#newMealName").value)) return;
  if ($("#newMealName").value == "") {
    statusMessage($("#mealStatus"), "Please enter a valid name!");
    return;
  }

  IDB.get("meals").then((rs) => {
    if (rs.some((item) => item[1] == selectedAdminMeal.meal)) {
      statusMessage($("#mealStatus"), "This meal already exists!");
    } else {
      FB.set(FB.ref(db, `meals/info/${$("#newMealName").value}`), {
        meal: "Dinner",
        mealName: $("#newMealName").value,
        meatType: $("#newMeatType").value,
        mealType: $("#newMealType").value,
        timestamp: FB.serverTimestamp(),
      });

      statusMessage(
        $("#mealStatus"),
        `Meal ${$("#newMealName").value} added successfully!`
      );

      $("#newMealName").dataset.mealname = $("#newMealName").value;
    }
  });
}

async function selectAdminMeal(meal) {
  let list = await IDB.get("meals");
  let selected = await list.filter((item) => item[1] == meal)[0];
  selectedAdminMeal.meal = selected[1];
  selectedAdminMeal.meatType = selected[0];
  selectedAdminMeal.mealType = selected[3];

  $("#newMealName").dataset.mealname = selectedAdminMeal.meal;
  $("#newMealName").value = selectedAdminMeal.meal;
  $("#newMeatType").value = selectedAdminMeal.meatType;
  $("#newMealType").value = selectedAdminMeal.mealType;
  $("#editMealSearch").value = selectedAdminMeal.meal;
  $("#editMealSearch").value = "";
}

function selectAdminMealType(meal) {
  $("#editMealTypes").value = "";
  $("#newMealTypeName").value = meal;
  $("#newMealTypeName").dataset.mealtype = meal;
}

function selectAdminMeatType(meat) {
  $("#editMeatTypes").value = "";
  $("#newMeatTypeName").value = meat;
  $("#newMeatTypeName").dataset.meattype = meat;
}

function updateSelectedAdminMeal() {
  selectedAdminMeal.meal = $("#editMealSearch").value;
  selectedAdminMeal.meatType = $("#newMeatType").value;
  selectedAdminMeal.mealType = $("#newMealType").value;
}

function deleteAdminMeal(meal) {
  FB.remove(FB.ref(db, `meals/info/${meal}`)).then(() => {
    statusMessage(
      $("#mealStatus"),
      "Meal '" + meal + "' deleted successfully!"
    );
    $("#newMealName").value = "";
    $("#newMealName").dataset.mealname = "";
    $("#editMealSearch").value = "";
    $("#newMeatType").value = "Any";
    $("#newMealType").value = "Any";
  });
}

async function deleteAdminMealType(mealType) {
  if (demo()) return;
  let mealTypes = (await IDB.get("mealTypes")).split(",");
  mealTypes.splice(mealTypes.indexOf(mealType), 1).sort();
  FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
  $("#editMealTypes").value = "";
  $("#newMealTypeName").value = "";
  $("#newMealTypeName").dataset.mealtype = "";
  statusMessage(
    $("#mealTypeStatus"),
    "Meal Type '" + mealType + "' deleted successfully!"
  );
}

async function deleteAdminMeatType(meatType) {
  if (demo()) return;
  let meatTypes = (await IDB.get("meatTypes")).split(",");
  meatTypes.splice(meatTypes.indexOf(meatType), 1).sort();
  FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
  $("#editMeatTypes").value = "";
  $("#newMeatTypeName").value = "";
  $("#newMeatTypeName").dataset.meattype = "";
  statusMessage(
    $("#meatTypeStatus"),
    "Meat Type '" + meatType + "' deleted successfully!"
  );
}

function editAdminMeal() {
  if (demo()) return;
  let newMealName = $("#newMealName").value;
  let oldMealName = $("#newMealName").dataset.mealname;

  if (oldMealName == undefined || oldMealName == "") {
    statusMessage($("#mealStatus"), "No meal selected for update!");
    return;
  }

  IDB.get("meals").then((rs) => {
    // if the name has not changed, update it
    if (newMealName == oldMealName) {
      FB.set(FB.ref(db, `meals/info/${newMealName}`), {
        meal: "Dinner",
        mealName: newMealName,
        meatType: selectedAdminMeal.meatType,
        mealType: selectedAdminMeal.mealType,
        timestamp: FB.serverTimestamp(),
      });
      statusMessage($("#mealStatus"), "Meal updated successfully!");
    } else {
      // else if the name has changed, update the whole record and remove the previous

      FB.set(FB.ref(db, `meals/info/${newMealName}`), {
        meal: "Dinner",
        mealName: newMealName,
        meatType: selectedAdminMeal.meatType,
        mealType: selectedAdminMeal.mealType,
        timestamp: FB.serverTimestamp(),
      })
        .then(async () => {
          await FB.remove(FB.ref(db, `meals/info/${oldMealName}`));
          $("#newMealName").dataset.mealname = newMealName;
        })
        .then(() => {
          statusMessage($("#mealStatus"), "Meal updated successfully!");
          $("#newMealName").dataset.mealname = newMealName;
        });
    }
  });
}

async function editAdminMealType() {
  let changedMealType = $("#newMealTypeName").value;
  let previousMealType = $("#newMealTypeName").dataset.mealtype;
  if (changedMealType == "") {
    statusMessage(
      $("#mealTypeStatus"),
      "Please select an option from the Meal Type List first."
    );
  } else {
    let mealTypes = (await IDB.get("mealTypes")).split(",");

    if (!mealTypes.some((item) => item == previousMealType)) {
      statusMessage(
        $("#mealTypeStatus"),
        "The Meal Type '" +
          changedMealType +
          "' does not exist, unable to save."
      );
    } else {
      mealTypes.splice(mealTypes.indexOf(mealType), 1, changedMealType);
      FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
      statusMessage(
        $("#mealTypeStatus"),
        "The Meal Type: '" +
          previousMealType +
          "' has been updated to: '" +
          changedMealType +
          "'"
      );
      $("#newMealTypeName").dataset.mealtype = changedMealType;
    }
  }
}

async function editAdminMeatType() {
  if (demo()) return;
  let changedMeatType = $("#newMeatTypeName").value;
  let oldMeatType = $("#newMeatTypeName").dataset.meattype;
  if (changedMeatType == "") {
    statusMessage(
      $("#meatTypeStatus"),
      "Please select an option from the Meat Type List first."
    );
  } else {
    let meatTypes = (await IDB.get("meatTypes")).split(",");

    if (!meatTypes.some((item) => item == oldMeatType)) {
      statusMessage(
        $("#meatTypeStatus"),
        "The Meat Type '" + oldMeatType + "' does not exist, unable to save."
      );
    } else {
      meatTypes.splice(meatTypes.indexOf(meatType), 1, changedMeatType);
      FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
      statusMessage(
        $("#meatTypeStatus"),
        "Meat Type: '" + oldMeatType + "' updated to: '" + changedMeatType + "'"
      );
    }
  }
}

function newAdminMealType() {
  if (demo()) return;
  let newMealType = $("#newMealTypeName").value;

  if (newMealType == "") {
    statusMessage($("#mealTypeStatus"), "Please enter a new Meal Type name.");
    return;
  }

  IDB.get("mealTypes").then((rs) => {
    let mealTypes = rs.split(",");
    if (mealTypes.some((item) => item == newMealType)) {
      statusMessage($("#mealTypeStatus"), "This Meal Type already exists!");
    } else {
      mealTypes.push(newMealType);
      mealTypes.sort();
      FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
      $("#newMealTypeName").dataset.mealtype = newMealType;
      statusMessage($("#mealTypeStatus"), "New Meal Type Added");
    }
  });
}

function newAdminMeatType() {
  if (demo()) return;
  let newMeatType = $("#newMeatTypeName").value;
  if (newMeatType == "") {
    statusMessage($("#meatTypeStatus"), "Please enter a new Meat Type name.");
    return;
  }

  IDB.get("meatTypes").then((rs) => {
    let meatTypes = rs.split(",");
    if (meatTypes.some((item) => item == newMeatType)) {
      statusMessage($("#meatTypeStatus"), "This Meat Type already exists!");
    } else {
      meatTypes.push(newMeatType);
      meatTypes.sort();
      FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
      $("#newMeatTypeName").dataset.meattype = newMeatType;
      statusMessage($("#meatTypeStatus"), "New Meat Type Added!");
    }
  });
}

async function statusMessage(element, msg) {
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

document.body.addEventListener("dblclick", (e) => {
  e.preventDefault();
});

document.addEventListener(
  "DOMContentLoaded",
  () => {
    signInAnonymously(auth)
      .then(() => {
        // Signed in..
        loadData();

        function updateIDBWeek(week, day, val) {
          IDB.get(week)
            .then((rs) => {
              rs[day] = val;
              return rs;
            })
            .then((rs) => {
              IDB.set(week, rs);
            });
          document.querySelector(
            `[data-day=${day}][data-week=${week}][data-type="meal"] .mealData`
          ).innerHTML = val;
        }
        // functions that listen to changes to the firebase nodes and updates the client interface accordingly.
        FB.onValue(mealType, async (snapshot) => {
          await updateIDBMealTypes(snapshot.val());
          loadFilterOptions();
        });
        FB.onValue(meatType, async (snapshot) => {
          await updateIDBMeatTypes(snapshot.val());
          loadFilterOptions();
        });
        FB.onChildAdded(mealsInfo, (snapshot) => {
          // per FireBase documentation, ".onChildAdded" event is called once
          // for each child WHEN THE SCRIPT IS LOADED, and then ONCE per actual
          // add event; to prevent unnecessary additional function calls, we check
          // how long it's been since the last trigger, and ignore it if it's
          // been less than 500ms;

          if (Date.now() - lastAdded > 500) {
            updateIDBMeals(snapshot.val(), "added");
            lastAdded = Date.now();
          }
        });
        FB.onChildChanged(mealsInfo, (snapshot) => {
          updateIDBMeals(snapshot.val(), "changed");
        });
        FB.onChildRemoved(mealsInfo, (snapshot) => {
          updateIDBMeals(snapshot.val(), "removed");
        });
        FB.onChildChanged(fbPrevious, (data) => {
          const val = data.val();
          const day = data.key;
          updateIDBWeek("previous", day, val);
        });
        FB.onChildChanged(fbCurrent, (data) => {
          const val = data.val();
          const day = data.key;
          updateIDBWeek("current", day, val);
        });
        FB.onChildChanged(fbNext, (data) => {
          const val = data.val();
          const day = data.key;
          updateIDBWeek("next", day, val);
        });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        log("Error Code: " + errorCode + " Error Message: " + errorMessage);
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

    $("#editMealSearch").addEventListener("input", () => {
      filterSearch($("#editMealSearch"), $("#editMealList"), adminMealOptions);
      updateSelectedAdminMeal();
    });

    $("#editMealSearch").addEventListener("focus", () => {
      filterSearch($("#editMealSearch"), $("#editMealList"), adminMealOptions);
      $("#editMealList").classList.add("showAdminList");
    });

    $("#mainListDropDown").addEventListener("click", () => {
      $("#mainList").classList.toggle("showList");
      $("#filterOptionsPanel").classList.remove("showFilters");
    });

    $("#adminMealListDropDown").addEventListener("click", () => {
      $("#editMealList").classList.toggle("showAdminList");
    });

    $("#newAdminMeal").addEventListener("click", (e) => {
      if (!validInput($("#mealStatus"), $("#newMealName").value)) return;
      newAdminMeal();
    });

    $("#newMeatType").addEventListener("change", () => {
      updateSelectedAdminMeal();
    });

    $("#newMealType").addEventListener("change", () => {
      updateSelectedAdminMeal();
    });

    $("#editMeatTypes").addEventListener("input", () => {
      $("#editMeatTypeList").classList.add("showAdminList");
      filterSearch($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#editMeatTypes").addEventListener("focus", () => {
      $("#editMeatTypeList").classList.add("showAdminList");
      filterSearch($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#adminMeatTypeListDropDown").addEventListener("click", () => {
      $("#editMeatTypeList").classList.toggle("showAdminList");
      filterSearch($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#adminMealTypeListDropDown").addEventListener("click", () => {
      $("#editMealTypeList").classList.toggle("showAdminList");
      filterSearch($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#newAdminMeatType").addEventListener("click", () => {
      if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
        return;
      }
      newAdminMeatType();
    });

    $("#delAdminMeal").addEventListener("click", () => {
      if (!validInput($("#mealStatus"), $("#newMealName").value)) return;
      let meal = $("#newMealName").value;
      if (meal == "") {
        statusMessage($("#mealStatus"), "No meal selected for deletion.");
        return;
      } else {
        if (confirm("You are about to DELETE a meal. Confirm?")) {
          deleteAdminMeal(meal);
        }
      }
    });

    $("#editAdminMeal").addEventListener("click", () => {
      if (!validInput($("#mealStatus"), $("#newMealName").value)) return;
      if ($("#newMealName").value == "") {
        statusMessage($("#mealStatus"), "No meal selected for changes.");
      } else {
        editAdminMeal();
      }
    });

    $("#newAdminMealType").addEventListener("click", () => {
      if (!validInput($("#mealTypeStatus"), $("#newMealTypeName").value)) {
        return;
      }

      newAdminMealType();
    });

    $("#delAdminMeatType").addEventListener("click", async () => {
      if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
        return;
      }
      let meatType = $("#newMeatTypeName").value;
      let meatTypes = (await IDB.get("meatTypes")).split(",");

      if (!meatTypes.some((el) => el == meatType)) {
        statusMessage(
          $("#meatTypeStatus"),
          "Non-existent meat type! Cannot Delete."
        );

        return;
      }

      if (meatType == "") {
        statusMessage(
          $("#meatTypeStatus"),
          "No meat type selected for deletion!"
        );

        return;
      } else {
        if (
          confirm(
            "You are about to DELETE meat type: '" + meatType + "'! Confirm?"
          )
        ) {
          deleteAdminMeatType(meatType);
        }
      }
    });

    $("#delAdminMealType").addEventListener("click", async () => {
      if (!validInput($("#mealTypeStatus"), $("#newMealTypeName").value)) {
        return;
      }
      let mealType = $("#newMealTypeName").value;
      let mealTypes = (await IDB.get("mealTypes")).split(",");

      if (!mealTypes.some((el) => el == mealType)) {
        statusMessage(
          $("#mealTypeStatus"),
          "Nonexistent meal type! Cannot Delete."
        );
        return;
      }

      if (mealType == "") {
        statusMessage(
          $("#mealTypeStatus"),
          "No meal type selected for deletion!"
        );

        return;
      } else {
        if (
          confirm(
            "You are about to DELETE meal type: '" + mealType + "'! Confirm?"
          )
        ) {
          deleteAdminMealType(mealType);
        }
      }
    });

    $("#editAdminMealType").addEventListener("click", () => {
      if (!validInput($("#mealTypeStatus"), $("#newMealTypeName").value)) {
        return;
      }
      let mealType = $("#newMealTypeName").value;

      if (mealType == "") {
        statusMessage($("#mealTypeStatus"), "No meal selected for changes!");
      } else {
        editAdminMealType();
      }
    });

    $("#editAdminMeatType").addEventListener("click", () => {
      if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
        return;
      }
      let meatType = $("#newMeatTypeName").value;

      if (meatType == "") {
        statusMessage(
          $("#meatTypeStatus"),
          "No Meat Type selected for changes!"
        );
      } else {
        editAdminMeatType();
      }
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

    $("#editMealTypes").addEventListener("focus", () => {
      $("#editMealTypeList").classList.add("showAdminList");
      filterSearch($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#editMealTypes").addEventListener("input", () => {
      $("#editMealTypeList").classList.add("showAdminList");
      filterSearch($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#showAllMeals").addEventListener("click", () => {
      showAllMeals();
    });
  },
  false
);
