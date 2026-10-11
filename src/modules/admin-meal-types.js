import { $, validInput, statusMessage, canSendToFirebase } from "./utils.js";
import * as FB from "firebase/database";
import { db } from "./data.js";

let adminMealTypes = [];

export function getAdminMealTypes() {
    return adminMealTypes;
}

export function setAdminMealTypes(types) {
    adminMealTypes = types;
}

async function getMealTypesFromFirebase() {
    const snapshot = await FB.get(FB.ref(db, "meals/mealCategories"));
    if (!snapshot.exists()) return [];
    const raw = String(snapshot.val() || "");
    return raw ? raw.split(",") : [];
}

async function refreshMealTypesFromFirebase() {
    try {
        setAdminMealTypes(await getMealTypesFromFirebase());
    } catch (error) {
        console.error(error);
    }
}

export function selectAdminMealType(meal) {
    $("#editMealTypes").value = "";
    $("#newMealTypeName").value = meal;
    $("#newMealTypeName").dataset.mealtype = meal;
}

async function deleteAdminMealType(mealType) {
    if (!canSendToFirebase($("#mealTypeStatus"))) {
        return;
    }

    let mealTypes = await getMealTypesFromFirebase();
    mealTypes.splice(mealTypes.indexOf(mealType), 1);
    mealTypes.sort();
    try {
        await FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
        $("#editMealTypes").value = "";
        $("#newMealTypeName").value = "";
        $("#newMealTypeName").dataset.mealtype = "";
        statusMessage($("#mealTypeStatus"), "Meal Type '" + mealType + "' deleted successfully!");
    } catch (error) {
        console.error(error);
        statusMessage($("#mealTypeStatus"), "Could not delete meal type.");
    }
}

async function editAdminMealType() {
    if (!canSendToFirebase($("#mealTypeStatus"))) {
        return;
    }

    let changedMealType = $("#newMealTypeName").value;
    let previousMealType = $("#newMealTypeName").dataset.mealtype;
    if (changedMealType == "") {
        statusMessage(
            $("#mealTypeStatus"),
            "Please select an option from the Meal Type List first."
        );
    } else {
        let mealTypes = await getMealTypesFromFirebase();

        if (!mealTypes.some((item) => item == previousMealType)) {
            statusMessage(
                $("#mealTypeStatus"),
                "The Meal Type '" + changedMealType + "' does not exist, unable to save."
            );
        } else {
            mealTypes.splice(mealTypes.indexOf(previousMealType), 1, changedMealType);
            try {
                await FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
                statusMessage(
                    $("#mealTypeStatus"),
                    "The Meal Type: '" + previousMealType + "' has been updated to: '" +
                    changedMealType +
                    "'"
                );
                $("#newMealTypeName").dataset.mealtype = changedMealType;
            } catch (error) {
                console.error(error);
                statusMessage($("#mealTypeStatus"), "Could not update meal type.");
            }
        }
    }
}

async function newAdminMealType() {
    if (!canSendToFirebase($("#mealTypeStatus"))) {
        return;
    }

    let newMealType = $("#newMealTypeName").value;

    if (newMealType == "") {
        statusMessage($("#mealTypeStatus"), "Please enter a new Meal Type name.");
        return;
    }

    let mealTypes = await getMealTypesFromFirebase();
    if (mealTypes.some((item) => item == newMealType)) {
        statusMessage($("#mealTypeStatus"), "This Meal Type already exists!");
    } else {
        mealTypes.push(newMealType);
        mealTypes.sort();
        try {
            await FB.set(FB.ref(db, "meals/mealCategories"), mealTypes.join(","));
            $("#newMealTypeName").dataset.mealtype = newMealType;
            statusMessage($("#mealTypeStatus"), "New Meal Type Added");
        } catch (error) {
            console.error(error);
            statusMessage($("#mealTypeStatus"), "Could not add meal type.");
        }
    }
}

export function initAdminMealTypes(filterSearchFn, onDataUpdated) {
    $("#editMealTypes").addEventListener("focus", () => {
        $("#editMealTypeList").classList.add("showAdminList");
        filterSearchFn($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#editMealTypes").addEventListener("input", () => {
        $("#editMealTypeList").classList.add("showAdminList");
        filterSearchFn($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#adminMealTypeListDropDown").addEventListener("click", () => {
        $("#editMealTypeList").classList.toggle("showAdminList");
        let isVisible = $("#editMealTypeList").classList.contains("showAdminList");
        $("#adminMealTypeListDropDown").style.setProperty('--adminListDropDownIcon', isVisible ? '"\ue5ce"' : '"\ue5cf"');
        filterSearchFn($("#editMealTypes"), $("#editMealTypeList"), adminMealTypes);
    });

    $("#newAdminMealType").addEventListener("click", () => {
        if (!validInput($("#mealTypeStatus"), $("#newMealTypeName").value)) {
            return;
        }
        newAdminMealType();
    });

    $("#delAdminMealType").addEventListener("click", async () => {
        if (!validInput($("#mealTypeStatus"), $("#newMealTypeName").value)) {
            return;
        }
        let mealType = $("#newMealTypeName").value;
        let mealTypes = await getMealTypesFromFirebase();

        if (!mealTypes.some((el) => el == mealType)) {
            statusMessage($("#mealTypeStatus"), "Nonexistent meal type! Cannot Delete.");
            return;
        }

        if (mealType == "") {
            statusMessage($("#mealTypeStatus"), "No meal type selected for deletion!");
            return;
        } else {
            if (confirm("You are about to DELETE meal type: '" + mealType + "'! Confirm?")) {
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

    const updateAndNotify = () => refreshMealTypesFromFirebase().then(() => { if (onDataUpdated) onDataUpdated(); });
    updateAndNotify();
    FB.onValue(FB.ref(db, "meals/mealCategories"), updateAndNotify);
}
