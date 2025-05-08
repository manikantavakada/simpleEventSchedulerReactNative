import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Platform,
  TextInput,
  ToastAndroid
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import MultiSelect from "react-native-multiple-select";

import { createEvent } from "../api/api";

const CreateEventScreen = ({ navigation }) => {
  const today = new Date();
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "single",
    startDate: today,
    endDate: today,
    frequency: "weekly",
    interval: "1",
    weekdays: [],
    monthDays: [],
    endCondition: "date",
    occurrences: "5",
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const weekdaysOptions = [
    { id: "Monday", name: "Monday" },
    { id: "Tuesday", name: "Tuesday" },
    { id: "Wednesday", name: "Wednesday" },
    { id: "Thursday", name: "Thursday" },
    { id: "Friday", name: "Friday" },
    { id: "Saturday", name: "Saturday" },
    { id: "Sunday", name: "Sunday" },
  ];

  const monthDaysOptions = Array.from({ length: 31 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `${i + 1}${i + 1 === 1 ? "st" : i + 1 === 2 ? "nd" : i + 1 === 3 ? "rd" : "th"}`,
  }));

  const formatDate = (date) => date.toISOString().split("T")[0];

  const handleAddEvent = async () => {
    console.log("Attempting to create event with data:", newEvent);
    if (!newEvent.title.trim()) {
      alert("Please enter an event title");
      return;
    }
    if (newEvent.type === "recurring") {
      if (newEvent.frequency === "weekly" && newEvent.weekdays.length === 0) {
        alert("Please select at least one weekday");
        return;
      }
      if (newEvent.frequency === "monthly" && newEvent.monthDays.length === 0) {
        alert("Please select at least one day of the month");
        return;
      }
      if (!newEvent.interval || parseInt(newEvent.interval) <= 0) {
        alert("Interval must be a positive number");
        return;
      }
      if (newEvent.endCondition === "occurrences" && (!newEvent.occurrences || parseInt(newEvent.occurrences) <= 0)) {
        alert("Number of occurrences must be a positive number");
        return;
      }
    }

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description || null,
        type: newEvent.type,
        startDate: newEvent.startDate.toISOString(),
        ...(newEvent.type === "recurring" && {
          endDate: newEvent.endCondition === "date" ? newEvent.endDate.toISOString() : null,
          frequency: newEvent.frequency,
          interval: parseInt(newEvent.interval),
          weekdays: newEvent.frequency === "weekly" ? newEvent.weekdays : [],
          monthDays: newEvent.frequency === "monthly" ? newEvent.monthDays.map(Number) : [],
          occurrences: newEvent.endCondition === "occurrences" ? parseInt(newEvent.occurrences) : null,
          endCondition: newEvent.endCondition,
        }),
      };
      console.log("Submitting event data to API:", eventData);
      const response = await createEvent(eventData);
      console.log("Event successfully created, response:", response);
      setNewEvent({
        title: "",
        description: "",
        type: "single",
        startDate: today,
        endDate: today,
        frequency: "weekly",
        interval: "1",
        weekdays: [],
        monthDays: [],
        endCondition: "date",
        occurrences: "5",
      });
      ToastAndroid.show('Event is scheduled', ToastAndroid.SHORT);
    } catch (error) {
      console.error("Failed to create event:", error);
      alert(error.message);
    }
  };

  const renderForm = () => (
    <View style={styles.formContent}>
      <Text style={styles.formTitle}>Add New Event</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Event Title *"
        placeholderTextColor="#777"
        value={newEvent.title}
        onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
      />
      <TextInput
        style={styles.formInput}
        placeholder="Description (optional)"
        placeholderTextColor="#777"
        value={newEvent.description}
        onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
        multiline
      />
      <Text style={styles.formSubtitle}>Event Type</Text>
      <Picker
        selectedValue={newEvent.type}
        onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
        style={styles.formInput}
      >
        <Picker.Item label="Single" value="single" />
        <Picker.Item label="Recurring" value="recurring" />
      </Picker>
      <TouchableOpacity
        style={styles.formInput}
        onPress={() => setShowStartDatePicker(true)}
      >
        <Text style={styles.dateText}>
          Start Date: {formatDate(newEvent.startDate)}
        </Text>
      </TouchableOpacity>
      {showStartDatePicker && (
        <DateTimePicker
          value={newEvent.startDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={today}
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setNewEvent({ ...newEvent, startDate: date });
          }}
        />
      )}
      {newEvent.type === "recurring" && (
        <>
          <Text style={styles.formSubtitle}>Frequency</Text>
          <Picker
            selectedValue={newEvent.frequency}
            onValueChange={(value) => setNewEvent({ ...newEvent, frequency: value })}
            style={styles.formInput}
          >
            <Picker.Item label="Weekly" value="weekly" />
            <Picker.Item label="Monthly" value="monthly" />
          </Picker>
          <TextInput
            style={styles.formInput}
            placeholder={`Interval (every n ${newEvent.frequency === "weekly" ? "weeks" : "months"}) *`}
            placeholderTextColor="#777"
            value={newEvent.interval}
            onChangeText={(text) => setNewEvent({ ...newEvent, interval: text })}
            keyboardType="numeric"
          />
          {newEvent.frequency === "weekly" ? (
            <>
              <Text style={styles.formSubtitle}>Weekdays *</Text>
              <MultiSelect
                items={weekdaysOptions}
                uniqueKey="id"
                onSelectedItemsChange={(selectedItems) => {
                  console.log("Selected weekdays:", selectedItems);
                  setNewEvent({ ...newEvent, weekdays: selectedItems });
                }}
                selectedItems={newEvent.weekdays}
                selectText="Select Weekdays"
                searchInputPlaceholderText="Search Weekdays..."
                onChangeInput={(text) => console.log("Weekday search input:", text)}
                tagRemoveIconColor="#164289"
                tagBorderColor="#164289"
                tagTextColor="#164289"
                selectedItemTextColor="#164289"
                selectedItemIconColor="#164289"
                itemTextColor="#333"
                displayKey="name"
                searchInputStyle={{ color: "#333" }}
                submitButtonColor="#164289"
                submitButtonText="Submit"
                styleDropdownMenuSubsection={[styles.formInput, styles.multiSelect]}
                styleMainWrapper={styles.multiSelectWrapper}
              />
            </>
          ) : (
            <>
              <Text style={styles.formSubtitle}>Days of Month *</Text>
              <MultiSelect
                items={monthDaysOptions}
                uniqueKey="id"
                onSelectedItemsChange={(selectedItems) => {
                  console.log("Selected month days:", selectedItems);
                  setNewEvent({ ...newEvent, monthDays: selectedItems });
                }}
                selectedItems={newEvent.monthDays}
                selectText="Select Days"
                searchInputPlaceholderText="Search Days..."
                onChangeInput={(text) => console.log("Month day search input:", text)}
                tagRemoveIconColor="#164289"
                tagBorderColor="#164289"
                tagTextColor="#164289"
                selectedItemTextColor="#164289"
                selectedItemIconColor="#164289"
                itemTextColor="#333"
                displayKey="name"
                searchInputStyle={{ color: "#333" }}
                submitButtonColor="#164289"
                submitButtonText="Submit"
                styleDropdownMenuSubsection={[styles.formInput, styles.multiSelect]}
                styleMainWrapper={styles.multiSelectWrapper}
              />
            </>
          )}
          <Text style={styles.formSubtitle}>End Condition</Text>
          <Picker
            selectedValue={newEvent.endCondition}
            onValueChange={(value) => setNewEvent({ ...newEvent, endCondition: value })}
            style={styles.formInput}
          >
            <Picker.Item label="By End Date" value="date" />
            <Picker.Item label="By Number of Occurrences" value="occurrences" />
          </Picker>
          {newEvent.endCondition === "date" ? (
            <>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  End Date: {formatDate(newEvent.endDate)}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={newEvent.endDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={newEvent.startDate}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setNewEvent({ ...newEvent, endDate: date });
                  }}
                />
              )}
            </>
          ) : (
            <TextInput
              style={styles.formInput}
              placeholder="Number of Occurrences *"
              placeholderTextColor="#777"
              value={newEvent.occurrences}
              onChangeText={(text) => setNewEvent({ ...newEvent, occurrences: text })}
              keyboardType="numeric"
            />
          )}
        </>
      )}
      <View style={styles.formButtons}>
        <TouchableOpacity style={styles.formButton} onPress={handleAddEvent}>
          <Text style={styles.formButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formButton, { backgroundColor: "#6B7280" }]}
          onPress={() =>
            setNewEvent({
              title: "",
              description: "",
              type: "single",
              startDate: today,
              endDate: today,
              frequency: "weekly",
              interval: "1",
              weekdays: [],
              monthDays: [],
              endCondition: "date",
              occurrences: "5",
            })
          }
        >
          <Text style={styles.formButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("EventDates")}
          style={styles.iconButton}
        >
          <Image source={require("../assets/arrow.png")} style={styles.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.iconButton} />
      </View>
      <FlatList
        data={[{}]}
        renderItem={renderForm}
        keyExtractor={() => "form"}
        contentContainerStyle={styles.container}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f9f9f9",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#164289",
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    color: "#fff",
  },
  iconButton: {
    padding: 8,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  formContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#164289",
    marginBottom: 10,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  multiSelect: {
    height: 100,
  },
  multiSelectWrapper: {
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formButton: {
    backgroundColor: "#164289",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  formButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default CreateEventScreen;