insert into public.factories (id, name, industry_type, location, description, status)
values (
  '10000000-0000-4000-8000-000000000001',
  'Aero Systems Plant 01',
  'Aerospace',
  'Bengaluru, IN',
  'Demonstration facility with synthetic production and telemetry records.',
  'active'
)
on conflict (id) do nothing;

insert into public.processes
  (id, factory_id, name, description, sequence_order, expected_cycle_time, capacity_per_hour, status)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Material preparation', 'Cutting and preparation of incoming material.', 1, 7.8, 72, 'active'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Precision machining', 'CNC machining for aerospace components.', 2, 12.4, 58, 'active'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Surface treatment', 'Protective surface finishing.', 3, 9.6, 62, 'active'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Component assembly', 'Final assembly and fit checks.', 4, 18.2, 44, 'delayed')
on conflict (id) do nothing;

insert into public.machines
  (id, factory_id, process_id, name, machine_type, status, capacity_per_hour, current_utilization, temperature)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Prep line M-01', 'Cutting line', 'running', 72, 72, 61.2),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'CNC cell M-02', 'CNC mill', 'running', 58, 88, 68.5),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Finishing M-03', 'Coating station', 'running', 62, 64, 54.8),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'Assembly M-04', 'Assembly cell', 'running', 44, 96, 71.4)
on conflict (id) do nothing;

insert into public.machine_telemetry
  (id, machine_id, temperature, vibration, power_consumption, rotational_speed, processing_time, recorded_at, data_source)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 61.2, 0.18, 12.4, 1480, 7.8, now() - interval '12 minutes', 'simulated'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 68.5, 0.31, 18.8, 2100, 12.4, now() - interval '9 minutes', 'simulated'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 54.8, 0.16, 10.1, 1320, 9.6, now() - interval '6 minutes', 'simulated'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 71.4, 0.62, 16.7, 980, 18.2, now() - interval '3 minutes', 'simulated')
on conflict (id) do nothing;

insert into public.production_records
  (id, process_id, machine_id, units_produced, units_defective, processing_time, downtime_minutes, recorded_at)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 126, 2, 7.8, 4, now() - interval '1 hour'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 108, 3, 12.4, 11, now() - interval '50 minutes'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 114, 1, 9.6, 2, now() - interval '40 minutes'),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 96, 5, 18.2, 18, now() - interval '30 minutes')
on conflict (id) do nothing;

insert into public.process_dependencies
  (id, factory_id, source_process_id, target_process_id, dependency_type, impact_factor)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'sequential', 0.72),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'sequential', 0.68),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'sequential', 0.81)
on conflict (id) do nothing;

insert into public.inventory
  (id, factory_id, process_id, item_name, item_type, quantity, minimum_quantity, unit, storage_temperature, storage_humidity, expiry_date)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Aluminium alloy billets', 'raw_material', 840, 240, 'kg', 21, 42, null),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Aerospace-grade coating', 'raw_material', 56, 70, 'litres', 18, 40, now() + interval '180 days'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'CNC tool insert set', 'spare_part', 18, 12, 'units', null, null, null),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'Torque calibration kit', 'tool', 3, 1, 'units', null, null, null)
on conflict (id) do nothing;

insert into public.predictions
  (id, factory_id, process_id, machine_id, prediction_type, risk_level, probability, predicted_impact, estimated_time_to_event, recommendation, model_version)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'bottleneck', 'high', 0.82, 'Assembly queue may delay downstream inspection.', 28, 'Review load balance with the shift supervisor.', 'demo-rules-1.0'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'anomaly', 'medium', 0.64, 'Vibration is above its recent illustrative baseline.', 55, 'Inspect the machine during the next planned pause.', 'demo-rules-1.0')
on conflict (id) do nothing;

insert into public.alerts
  (id, factory_id, machine_id, process_id, prediction_id, title, description, severity, status)
values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000001', 'Assembly cycle time elevated', 'Illustrative cycle time is 24% above the process baseline.', 'critical', 'active'),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000003', null, 'Coating reserve below minimum', 'A replenishment review is recommended for the next shift.', 'warning', 'active')
on conflict (id) do nothing;

insert into public.interventions
  (id, factory_id, machine_id, process_id, prediction_id, intervention_type, description, status, expected_impact)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000001', 'workload_shift', 'Review a portion of assembly work for a qualified alternate cell.', 'proposed', 'May reduce the assembly queue after supervisor review.'),
  ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', null, '80000000-0000-4000-8000-000000000002', 'maintenance', 'Inspect spindle and vibration readings during the next planned pause.', 'approved', 'May identify wear before the next scheduled service.')
on conflict (id) do nothing;

insert into public.simulation_runs
  (id, factory_id, scenario_name, input_parameters, baseline_metrics, simulated_metrics, recommendations, status)
values
  ('b0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Shift 10% of assembly load', '{"utilization_delta": -6, "capacity_multiplier": 1.05}'::jsonb, '{"average_utilization": 80, "capacity_per_hour": 236}'::jsonb, '{"average_utilization": 74, "capacity_per_hour": 247.8}'::jsonb, '["Review alternate-cell qualification before acting."]'::jsonb, 'completed')
on conflict (id) do nothing;

insert into public.factory_settings
  (id, factory_id, configuration, alert_thresholds, automation_enabled)
values
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"timezone": "Asia/Kolkata", "shift_hours": 8, "industry_profile": "aerospace"}'::jsonb, '{"temperature_celsius": 82, "vibration_mm_s": 0.7, "inventory_days": 2}'::jsonb, false)
on conflict (id) do nothing;
