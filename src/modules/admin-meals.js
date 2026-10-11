import { $, validInput, statusMessage, canSendToFirebase } from "./utils.js";
import * as FB from "firebase/database";
import { db } from "./data.js";

let adminMealOptions = [];
let selectedAdminMeal = {};

export function getAdminMealOptions() {
    return adminMealOptions;
}

export function setAdminMealOptions(opts) {
    adminMealOptions = opts;
}

async function getMealsFromFirebase() {
    let arr = [];
    const snapshot = await FB.get(FB.ref(db, "meals/info"));
    if (snapshot.exists()) {
        const entries = Object.entries(snapshot.val());
        entries.forEach((el) => {
            arr.push([el[1].meatType, el[1].mealName, el[1].meal, el[1].mealType, el[1].timestamp]);
        });
    }
    return arr;
}

async function refreshMealsFromFirebase() {
    try {
        const arr = await getMealsFromFirebase();
        setAdminMealOptions(arr.map(el => el[1]));
    } catch (error) {
        console.error("Error loading meals:", error);
    }
}

async function getMealByName(meal) {
    const list = await getMealsFromFirebase();
    return list.find((item) => item[1] == meal);
}

async function mealNameExistsInList(mealName) {
    const list = await getMealsFromFirebase();
    return list.some((item) => item[1] == mealName);
}

export function fillAdminOptGroups(uniqueMeats, uniqueMealTypes) {
    let selectedNotEmpty = Object.keys(selectedAdminMeal).length != 0;

    $("#newMeatType").innerHTML = "";
    $("#newMealType").innerHTML = "";

    uniqueMeats.forEach((el) => {
        let selected = selectedNotEmpty && el == selectedAdminMeal.meatType;
        $("#newMeatType").add(new Option(el, el, selected, selected));
    });

    uniqueMealTypes.forEach((el) => {
        let selected = selectedNotEmpty && el == selectedAdminMeal.mealType;
        $("#newMealType").add(new Option(el, el, selected, selected));
    });
}

export function selectAdminMeal(meal) {
    getMealByName(meal).then((selected) => {
        if (!selected) return;
        selectedAdminMeal.meal = selected[1];
        selectedAdminMeal.meatType = selected[0];
        selectedAdminMeal.mealType = selected[3];

        $("#newMealName").dataset.mealname = selectedAdminMeal.meal;
        $("#newMealName").value = selectedAdminMeal.meal;
        $("#newMeatType").value = selectedAdminMeal.meatType;
        $("#newMealType").value = selectedAdminMeal.mealType;
        $("#editMealSearch").value = selectedAdminMeal.meal;
        $("#editMealSearch").value = "";
    });
}

export function updateSelectedAdminMeal() {
    selectedAdminMeal.meal = $("#editMealSearch").value;
    selectedAdminMeal.meatType = $("#newMeatType").value;
    selectedAdminMeal.mealType = $("#newMealType").value;
}

async function newAdminMeal() {
    if (!canSendToFirebase($("#mealStatus"))) {
        return;
    }

    if (!validInput($("#mealStatus"), $("#newMealName").value)) return;
    if ($("#newMealName").value == "") {
        statusMessage($("#mealStatus"), "Please enter a valid name!");
        return;
    }

    if (await mealNameExistsInList($("#newMealName").value)) {
        statusMessage($("#mealStatus"), "This meal already exists!");
    } else {
        await FB.set(FB.ref(db, `meals/info/${ $("#newMealName").value }`), {
            meal: "Dinner",
            mealName: $("#newMealName").value,
            meatType: $("#newMeatType").value,
            mealType: $("#newMealType").value,
            timestamp: FB.serverTimestamp(),
        });

        statusMessage(
            $("#mealStatus"),
            `Meal ${ $("#newMealName").value } added successfully!`
        );

        $("#newMealName").dataset.mealname = $("#newMealName").value;
    }
}

async function deleteAdminMeal(meal) {
    if (!canSendToFirebase($("#mealStatus"))) {
        return;
    }

    try {
        await FB.remove(FB.ref(db, `meals/info/${ meal }`));
        statusMessage($("#mealStatus"), "Meal '" + meal + "' deleted successfully!");
        $("#newMealName").value = "";
        $("#newMealName").dataset.mealname = "";
        $("#editMealSearch").value = "";
        $("#newMeatType").value = "Any";
        $("#newMealType").value = "Any";
    } catch (error) {
        console.error(error);
        statusMessage($("#mealStatus"), "Could not delete meal.");
    }
}

async function editAdminMeal() {
    if (!canSendToFirebase($("#mealStatus"))) {
        return;
    }

    let newMealName = $("#newMealName").value;
    let oldMealName = $("#newMealName").dataset.mealname;

    if (oldMealName == undefined || oldMealName == "") {
        statusMessage($("#mealStatus"), "No meal selected for update!");
        return;
    }

    try {
        if (newMealName == oldMealName) {
            await FB.set(FB.ref(db, `meals/info/${ newMealName }`), {
                meal: "Dinner",
                mealName: newMealName,
                meatType: selectedAdminMeal.meatType,
                mealType: selectedAdminMeal.mealType,
                timestamp: FB.serverTimestamp(),
            });
            statusMessage($("#mealStatus"), "Meal updated successfully!");
        } else {
            await FB.set(FB.ref(db, `meals/info/${ newMealName }`), {
                meal: "Dinner",
                mealName: newMealName,
                meatType: selectedAdminMeal.meatType,
                mealType: selectedAdminMeal.mealType,
                timestamp: FB.serverTimestamp(),
            });
            await FB.remove(FB.ref(db, `meals/info/${ oldMealName }`));
            $("#newMealName").dataset.mealname = newMealName;
            statusMessage($("#mealStatus"), "Meal updated successfully!");
        }
    } catch (error) {
        console.error(error);
        statusMessage($("#mealStatus"), "Could not update meal.");
    }
}

export function initAdminMeals(filterSearchFn, onDataUpdated) {
    $("#editMealSearch").addEventListener("input", () => {
        filterSearchFn($("#editMealSearch"), $("#editMealList"), adminMealOptions);
        updateSelectedAdminMeal();
    });

    $("#editMealSearch").addEventListener("focus", () => {
        filterSearchFn($("#editMealSearch"), $("#editMealList"), adminMealOptions);
        $("#editMealList").classList.add("showAdminList");
    });

    $("#adminMealListDropDown").addEventListener("click", () => {
        $("#editMealList").classList.toggle("showAdminList");
        let isVisible = $("#editMealList").classList.contains("showAdminList");
        $("#adminMealListDropDown").style.setProperty('--adminListDropDownIcon', isVisible ? '"\ue5ce"' : '"\ue5cf"');
        filterSearchFn($("#editMealSearch"), $("#editMealList"), adminMealOptions);
    });

    $("#newMeatType").addEventListener("change", () => {
        updateSelectedAdminMeal();
    });

    $("#newMealType").addEventListener("change", () => {
        updateSelectedAdminMeal();
    });

    $("#newAdminMeal").addEventListener("click", () => {
        if (!validInput($("#mealStatus"), $("#newMealName").value)) return;
        newAdminMeal();
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

    const updateAndNotify = () => refreshMealsFromFirebase().then(() => { if (onDataUpdated) onDataUpdated(); });
    updateAndNotify();
    FB.onChildAdded(FB.ref(db, "meals/info"), updateAndNotify);
    FB.onChildChanged(FB.ref(db, "meals/info"), updateAndNotify);
    FB.onChildRemoved(FB.ref(db, "meals/info"), updateAndNotify);
}
