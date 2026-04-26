import { i } from "@instantdb/core";

// Define the schema with proper InstantDB types
const schema = i.schema({
  entities: {
    queue_stages: i.entity({
      name: i.string(),
      display_name: i.string(),
      order_number: i.number(),
      is_active: i.boolean(),
      created_at: i.string(),
    }),
    emergency_flags: i.entity({
      name: i.string(),
      description: i.string(),
      is_active: i.boolean(),
      created_at: i.string(),
    }),
    patients: i.entity({
      phone_number: i.string(),
      full_name: i.string(),
      age: i.number().optional(),
      visit_reason: i.string(),
      created_at: i.string(),
      updated_at: i.string(),
    }),
    queue_entries: i.entity({
      queue_number: i.string(),
      position_in_queue: i.number().optional(),
      has_emergency_flag: i.boolean(),
      status: i.string(), // waiting, in_service, completed, cancelled
      checked_in_at: i.string(),
      completed_at: i.string().optional(),
      notes: i.string().optional(),
      created_at: i.string(),
      updated_at: i.string(),
    }),
    queue_history: i.entity({
      entered_at: i.string(),
      exited_at: i.string().optional(),
    }),
    patient_emergency_flags: i.entity({
      created_at: i.string(),
    }),
    user_roles: i.entity({
      email: i.string(),
      role: i.string(), // admin, receptionist, doctor, billing, pharmacist
      department: i.string().optional(),
      is_active: i.boolean(),
      email_verified: i.boolean(),
      created_at: i.string(),
    }),
    sms_logs: i.entity({
      phone_number: i.string(),
      message: i.string(),
      status: i.string(), // pending, sent, failed, delivered
      external_id: i.string().optional(),
      sent_at: i.string(),
    }),
    system_settings: i.entity({
      key: i.string(),
      value_json: i.string(),
      updated_at: i.string(),
    }),
    checkin_cooldown_overrides: i.entity({
      phone_number: i.string(),
      bypass_until: i.string(),
      reason: i.string().optional(),
      created_at: i.string(),
    }),
  },
  links: {
    queue_entry_patient: {
      forward: { on: "queue_entries", has: "one", label: "patient" },
      reverse: { on: "patients", has: "many", label: "queue_entries" },
    },
    queue_entry_stage: {
      forward: { on: "queue_entries", has: "one", label: "current_stage" },
      reverse: { on: "queue_stages", has: "many", label: "queue_entries" },
    },
    queue_history_entry: {
      forward: { on: "queue_history", has: "one", label: "queue_entry" },
      reverse: { on: "queue_entries", has: "many", label: "history" },
    },
    queue_history_stage: {
      forward: { on: "queue_history", has: "one", label: "stage" },
      reverse: { on: "queue_stages", has: "many", label: "history" },
    },
    queue_history_user: {
      forward: { on: "queue_history", has: "one", label: "served_by" },
      reverse: { on: "user_roles", has: "many", label: "history" },
    },
    patient_emergency_flag_entry: {
      forward: { on: "patient_emergency_flags", has: "one", label: "queue_entry" },
      reverse: { on: "queue_entries", has: "many", label: "emergency_flags" },
    },
    patient_emergency_flag_def: {
      forward: { on: "patient_emergency_flags", has: "one", label: "flag_definition" },
      reverse: { on: "emergency_flags", has: "many", label: "patient_flags" },
    },
    patient_emergency_flag_user: {
      forward: { on: "patient_emergency_flags", has: "one", label: "noted_by" },
      reverse: { on: "user_roles", has: "many", label: "flagged_entries" },
    },
    sms_log_patient: {
      forward: { on: "sms_logs", has: "one", label: "patient" },
      reverse: { on: "patients", has: "many", label: "sms_logs" },
    },
    sms_log_entry: {
      forward: { on: "sms_logs", has: "one", label: "queue_entry" },
      reverse: { on: "queue_entries", has: "many", label: "sms_logs" },
    },
    system_settings_user: {
      forward: { on: "system_settings", has: "one", label: "updated_by" },
      reverse: { on: "user_roles", has: "many", label: "settings_updates" },
    },
    cooldown_override_user: {
      forward: { on: "checkin_cooldown_overrides", has: "one", label: "created_by" },
      reverse: { on: "user_roles", has: "many", label: "cooldown_overrides" },
    },
  },
});

// Export schema type for use in the app
export type AppSchema = typeof schema;
export default schema;
