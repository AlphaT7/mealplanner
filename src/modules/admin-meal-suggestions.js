import { $, statusMessage, canSendToFirebase } from "./utils.js";
import * as FB from "firebase/database";
import { db } from "./data.js";

let adminSuggestions = [];

async function syncSuggestionTextForSelectedDay() {
    const suggestionDay = $("#suggestionDay");
    const suggestionText = $("#suggestionText");

    if (!suggestionDay || !suggestionText) return;

    const snapshot = await FB.get(FB.ref(db, "suggestions"));
    const suggestions = snapshot.exists() ? snapshot.val() : null;
    if (!suggestions || typeof suggestions !== "object") {
        suggestionText.value = "";
        return;
    }

    const selectedDay = suggestionDay.value;
    const selectedDayLower = selectedDay.toLowerCase();

    const matchedKey = Object.keys(suggestions).find(
        (key) => key.toLowerCase() === selectedDayLower
    );

    suggestionText.value = matchedKey && typeof suggestions[matchedKey] === "string"
        ? suggestions[matchedKey]
        : "";
}

export function getAdminSuggestions() {
    return adminSuggestions;
}

export function setAdminSuggestions(suggestions) {
    adminSuggestions = Object.values(suggestions)
        .map((suggestion) => String(suggestion).split(",").map((str) => str.trim()))
        .flat();
}

async function refreshSuggestionsFromFirebase() {
    try {
        const snapshot = await FB.get(FB.ref(db, "suggestions"));
        if (snapshot.exists()) {
            const val = snapshot.val();
            setAdminSuggestions(val);
            await syncSuggestionTextForSelectedDay();
        } else {
            setAdminSuggestions({});
            await syncSuggestionTextForSelectedDay();
        }
    } catch (error) {
        console.error(error);
    }
}

export function initAdminMealSuggestions() {
    $("#suggestionDay")?.addEventListener("change", () => {
        syncSuggestionTextForSelectedDay();
    });

    $("#saveSuggestion")?.addEventListener("click", async () => {
        const statusEl = $("#mealSuggestionStatus");
        const suggestionDay = $("#suggestionDay");
        const suggestionText = $("#suggestionText");
        const day = suggestionDay.value;
        const text = suggestionText.value;

        if (!canSendToFirebase(statusEl)) {
            return;
        }

        if (!day) {
            if (statusEl) {
                statusMessage(statusEl, "Please select a day.");
            }
            return;
        }

        try {
            const dayKey = day.toLowerCase();
            await FB.set(FB.ref(db, `suggestions/${ dayKey }`), text);
            await refreshSuggestionsFromFirebase();

            if (statusEl) {
                statusMessage(statusEl, `Saved suggestion for ${ day }.`);
            }
        } catch (error) {
            console.error(error);
            if (statusEl) {
                statusMessage(statusEl, "Could not save suggestion.");
            }
        }
    });

    refreshSuggestionsFromFirebase();
    FB.onValue(FB.ref(db, "suggestions"), refreshSuggestionsFromFirebase);
}
