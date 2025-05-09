import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  TextInput,
  ToastAndroid
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import MultiSelect from "react-native-multiple-select";
import { createEvent } from "../api/api";

// Component for creating single or recurring events
const CreateEventScreen = ({ navigation }) => {
  // Initialize today's date, normalized to midnight UTC
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // State to manage form inputs for the new event
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "single", // Single or recurring event
    startDate: today,
    endDate: today,
    frequency: "weekly", // Weekly or monthly for recurring events
    interval: "", // Interval between occurrences
    weekdays: [], // Selected weekdays for weekly events
    monthDays: [], // Selected days for monthly events
    endCondition: "date", // End by date or number of occurrences
    occurrences: "", // Number of occurrences for recurring events
  });

  // State to control visibility of date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Options for weekday selection in MultiSelect
  const weekdaysOptions = [
    { id: "Monday", name: "Monday" },
    { id: "Tuesday", name: "Tuesday" },
    { id: "Wednesday", name: "Wednesday" },
    { id: "Thursday", name: "Thursday" },
    { id: "Friday", name: "Friday" },
    { id: "Saturday", name: "Saturday" },
    { id: "Sunday", name: "Sunday" },
  ];

  // Options for day-of-month selection (1st to 31st)
  const monthDaysOptions = Array.from({ length: 31 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `${i + 1}${i + 1 === 1 ? "st" : i + 1 === 2 ? "nd" : i + 1 === 3 ? "rd" : "th"}`,
  }));

  // Format date as DD/MM/YYYY for display
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle form submission to create a new event
  const handleAddEvent = async () => {
    console.log("Attempting to create event with data:", newEvent);

    // Validate required fields
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
      // Prepare event data for API submission, normalizing dates to UTC
      const eventData = {
        title: newEvent.title,
        description: newEvent.description || null,
        type: newEvent.type,
        startDate: new Date(Date.UTC(
          newEvent.startDate.getUTCFullYear(),
          newEvent.startDate.getUTCMonth(),
          newEvent.startDate.getUTCDate()
        )).toISOString(),
        ...(newEvent.type === "recurring" && {
          endDate: newEvent.endCondition === "date" ? new Date(Date.UTC(
            newEvent.endDate.getUTCFullYear(),
            newEvent.endDate.getUTCMonth(),
            newEvent.endDate.getUTCDate()
          )).toISOString() : null,
          frequency: newEvent.frequency,
          interval: parseInt(newEvent.interval),
          weekdays: newEvent.frequency === "weekly" ? newEvent.weekdays : [],
          monthDays: newEvent.frequency === "monthly" ? newEvent.monthDays.map(Number) : [],
          occurrences: newEvent.endCondition === "occurrences" ? parseInt(newEvent.occurrences) : null,
          endCondition: newEvent.endCondition,
        }),
      };
      console.log("Submitting event data to API:", eventData);

      // Call API to create the event
      const response = await createEvent(eventData);
      console.log("Event successfully created, response:", response);

      // Determine the date to navigate to (first occurrence for monthly events)
      let navigateDate = newEvent.startDate;
      if (newEvent.type === "recurring" && newEvent.frequency === "monthly") {
        const monthDays = newEvent.monthDays.map(Number);
        const startDay = newEvent.startDate.getUTCDate();
        if (startDay > Math.min(...monthDays)) {
          navigateDate = new Date(Date.UTC(
            newEvent.startDate.getUTCFullYear(),
            newEvent.startDate.getUTCMonth() + 1,
            Math.min(...monthDays)
          ));
        }
      }

      // Reset form after successful submission
      setNewEvent({
        title: "",
        description: "",
        type: "single",
        startDate: today,
        endDate: today,
        frequency: "weekly",
        interval: "",
        weekdays: [],
        monthDays: [],
        endCondition: "date",
        occurrences: "",
      });

      // Show success message
      ToastAndroid.show('Event is scheduled', ToastAndroid.SHORT);
    } catch (error) {
      console.error("Failed to create event:", error);
      alert(error.message);
    }
  };

  // Render the event creation form
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
            if (date) {
              // Normalize selected date to UTC midnight
              const normalizedDate = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              ));
              setNewEvent({ ...newEvent, startDate: normalizedDate });
            }
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
                styleDropdownMenuSubsection={[styles.formInputmulti, styles.multiSelect]}
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
                    if (date) {
                      // Normalize selected date to UTC midnight
                      const normalizedDate = new Date(Date.UTC(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate()
                      ));
                      setNewEvent({ ...newEvent, endDate: normalizedDate });
                    }
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

  // Render the screen with a header and form inside a FlatList
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.header}>
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

// Styles for the CreateEventScreen component
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
    marginBottom: 15,
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
  formInputmulti: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  multiSelect: {
    height: 45,
  },
  multiSelectWrapper: {
    //marginBottom: 10,
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
