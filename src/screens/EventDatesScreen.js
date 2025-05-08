import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CalendarStrip from "react-native-calendar-strip";
import DateTimePicker from "@react-native-community/datetimepicker";
import moment from "moment";
import "moment/locale/en-in";
moment.locale("en-in");
import { getEventOccurrences, getOccurrencesByDate } from "../api/api";

const EventDatesScreen = ({ route, navigation }) => {
  const eventId = route?.params?.eventId;
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0]);
  const [occurrences, setOccurrences] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    console.log("EventDatesScreen mounted, eventId:", eventId, "selectedDate:", selectedDate);
    if (eventId) {
      const fetchEventOccurrences = async () => {
        try {
          console.log("Fetching occurrences for event ID:", eventId);
          const data = await getEventOccurrences(eventId);
          console.log("Event occurrences fetched:", data.occurrences);
          setOccurrences(data.occurrences);
        } catch (error) {
          console.error("Error fetching event occurrences:", error);
          alert("Failed to load event occurrences");
        }
      };
      fetchEventOccurrences();
    } else {
      const fetchDateOccurrences = async () => {
        try {
          console.log("Fetching occurrences for date:", selectedDate);
          const data = await getOccurrencesByDate(selectedDate);
          console.log("Date occurrences fetched:", data.occurrences);
          setOccurrences(data.occurrences);
        } catch (error) {
          console.error("Error fetching date occurrences:", error);
          alert("Failed to load events for this date");
        }
      };
      fetchDateOccurrences();
    }
  }, [eventId, selectedDate]);

  const onDatePickerChange = (event, selected) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selected) {
      const formattedDate = moment(selected).format("YYYY-MM-DD");
      console.log("Date picker selected:", formattedDate);
      setSelectedDate(formattedDate);
      if (calendarRef.current) {
        console.log("Updating CalendarStrip to:", formattedDate);
        calendarRef.current.updateSelectedDate(moment(formattedDate, "YYYY-MM-DD"));
      }
    }
  };

  const renderOccurrence = ({ item }) => {
    console.log("Rendering occurrence:", item);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => console.log("Date Selected:", item.date)}
      >
        <Image source={require("../assets/man.png")} style={styles.avatar} />
        <View style={styles.contentContainer}>
          <View style={styles.details}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.date}>Date: {new Date(item.date).toLocaleDateString("en-IN")}</Text>
            {item.description && (
              <Text style={styles.description}>Description: {item.description}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {occurrences.length === 0 && (
        <Text style={styles.noAppointments}>
          {eventId ? "No Occurrences Found" : "No Events on this Date"}
        </Text>
      )}
    </>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Image source={require("../assets/arrow.png")} style={styles.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {eventId ? "Event Occurrences" : "Events on Selected Date"}
        </Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {moment(selectedDate, "YYYY-MM-DD").format("DD/MM/YYYY")}
          </Text>
        </TouchableOpacity>
      </View>
      {!eventId && (
        <View style={styles.calendarContainer}>
          <CalendarStrip
            ref={calendarRef}
            scrollable
            style={styles.calendar}
            calendarColor={"#fff"}
            calendarHeaderStyle={{ color: "#164289", fontSize: 18, fontWeight: "700" }}
            highlightDateNumberStyle={{ color: "#fff" }}
            highlightDateNameStyle={{ color: "#fff" }}
            highlightDateContainerStyle={{ backgroundColor: "#164289", borderRadius: 15 }}
            dateNumberStyle={{ color: "#333" }}
            dateNameStyle={{ color: "#6B7280" }}
            selectedDate={moment(selectedDate, "YYYY-MM-DD")}
            onDateSelected={(date) => {
              const formattedDate = date.format("YYYY-MM-DD");
              console.log("Selected date in CalendarStrip:", formattedDate);
              setSelectedDate(formattedDate);
            }}
            startingDate={moment()}
            onLayout={() => console.log("CalendarStrip rendered")}
          />
        </View>
      )}
      <FlatList
        data={occurrences}
        keyExtractor={(item) => item.id}
        renderItem={renderOccurrence}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.container}
        ListEmptyComponent={null}
      />
      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onDatePickerChange}
          style={styles.datePicker}
        />
      )}
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
  datePickerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  calendar: {
    width: "100%",
    height: 120,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    marginVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#164289",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#164289",
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
  },
  noAppointments: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  datePicker: {
    backgroundColor: "#fff",
  },
});

export default EventDatesScreen;