import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from src.data import INFORMATIVE_SENSORS

class TurbofanDigitalTwin:
    """
    High-Fidelity Physics-Guided Turbofan Digital Twin Simulation.
    Simulates real-time degradation, multi-sensor telemetry generation,
    what-if operational stress scenarios, and prescriptive maintenance recommendations.
    """
    def __init__(self, engine_id: int = 1, initial_cycle: int = 1, base_max_life: int = 220):
        self.engine_id = engine_id
        self.cycle = initial_cycle
        self.flight_hours = initial_cycle * 2.4
        self.base_max_life = base_max_life
        
        # Subsystem health states (0.0 = pristine new, 1.0 = failure limit)
        self.fan_wear = 0.02
        self.hpc_wear = 0.03  # High pressure compressor fouling/wear
        self.combustor_wear = 0.01  # Combustor thermal distress
        self.hpt_wear = 0.04  # High pressure turbine blade degradation
        self.lpt_wear = 0.02  # Low pressure turbine degradation
        
        # Environmental and Operational Modifiers (What-If parameters)
        self.thermal_stress_multiplier = 1.0     # 1.0 = standard, 1.5 = severe hot ambient
        self.contamination_rate = 1.0            # 1.0 = standard, 2.0 = sand/volcanic ash
        self.thrust_derating = 0.0               # 0.0 = full rated thrust, 0.15 = 15% derated (extends life)
        
        # Baseline reference telemetry (healthy operational cycle 1 in FD001)
        self.nominal_sensors = {
            "op_setting_1": 0.0015, "op_setting_2": 0.0003, "op_setting_3": 100.0,
            "sensor_1": 518.67, "sensor_2": 642.15, "sensor_3": 1585.0, "sensor_4": 1400.5,
            "sensor_5": 14.62, "sensor_6": 21.61, "sensor_7": 554.2, "sensor_8": 2388.06,
            "sensor_9": 9050.0, "sensor_10": 1.30, "sensor_11": 47.15, "sensor_12": 521.8,
            "sensor_13": 2388.05, "sensor_14": 8138.5, "sensor_15": 8.41, "sensor_16": 0.03,
            "sensor_17": 391.0, "sensor_18": 2388.0, "sensor_19": 100.0, "sensor_20": 38.9,
            "sensor_21": 23.35
        }
        
        self.telemetry_history: List[Dict[str, float]] = []
        self._record_telemetry()

    def set_stress_parameters(
        self,
        thermal_stress: float = 1.0,
        contamination: float = 1.0,
        thrust_derate: float = 0.0
    ):
        """Update operational stress parameters for What-If scenario simulations."""
        self.thermal_stress_multiplier = max(0.5, min(thermal_stress, 2.5))
        self.contamination_rate = max(0.5, min(contamination, 3.0))
        self.thrust_derating = max(0.0, min(thrust_derate, 0.25))

    def apply_maintenance_action(self, action: str) -> Dict[str, Any]:
        """
        Simulate real-world maintenance actions:
        - 'compressor_wash': Cleans compressor, recovers 55% of HPC fouling.
        - 'hot_section_inspection': Borescope and blade treatment, recovers 40% of HPT wear.
        - 'major_overhaul': Full depot maintenance, restores engine subsystems to pristine.
        """
        recovery_log = ""
        if action == "compressor_wash":
            old_hpc = self.hpc_wear
            self.hpc_wear = max(0.02, self.hpc_wear * 0.45)
            recovery_log = f"Compressor core wash completed. HPC fouling index reduced from {old_hpc:.2f} to {self.hpc_wear:.2f}."
        elif action == "hot_section_inspection":
            old_hpt = self.hpt_wear
            self.hpt_wear = max(0.03, self.hpt_wear * 0.60)
            recovery_log = f"Hot section inspection & blade treatment completed. HPT wear reduced from {old_hpt:.2f} to {self.hpt_wear:.2f}."
        elif action == "major_overhaul":
            self.fan_wear = 0.02
            self.hpc_wear = 0.03
            self.combustor_wear = 0.01
            self.hpt_wear = 0.04
            self.lpt_wear = 0.02
            recovery_log = "Full depot-level engine overhaul completed. All subsystems restored to nominal baseline."
        else:
            recovery_log = f"Unknown maintenance action: {action}"
            
        self._record_telemetry()
        return {"action": action, "summary": recovery_log, "subsystems": self.get_subsystem_health()}

    def step(self, cycles: int = 1) -> Dict[str, Any]:
        """
        Advance the digital twin by `cycles`.
        Propagates physical wear models and generates new telemetry measurements.
        """
        for _ in range(cycles):
            self.cycle += 1
            self.flight_hours += 2.4
            
            # Non-linear exponential degradation rate modified by What-If parameters
            base_rate = (self.cycle / self.base_max_life) ** 2.2 * 0.006
            effective_rate = base_rate * self.thermal_stress_multiplier * self.contamination_rate * (1.0 - self.thrust_derating * 1.5)
            
            # Subsystem wear propagation
            self.fan_wear = min(1.0, self.fan_wear + effective_rate * 0.7 + np.random.normal(0, 0.0003))
            self.hpc_wear = min(1.0, self.hpc_wear + effective_rate * 1.3 * self.contamination_rate + np.random.normal(0, 0.0005))
            self.combustor_wear = min(1.0, self.combustor_wear + effective_rate * 0.9 * self.thermal_stress_multiplier + np.random.normal(0, 0.0003))
            self.hpt_wear = min(1.0, self.hpt_wear + effective_rate * 1.5 * self.thermal_stress_multiplier + np.random.normal(0, 0.0006))
            self.lpt_wear = min(1.0, self.lpt_wear + effective_rate * 0.8 + np.random.normal(0, 0.0004))
            
            self._record_telemetry()
            
        return self.get_current_state()

    def _generate_sensor_readings(self) -> Dict[str, float]:
        """Generate physics-consistent sensor values driven by subsystem degradation states."""
        s = dict(self.nominal_sensors)
        # Random sensor measurement noise
        noise = lambda sigma: float(np.random.normal(0, sigma))
        
        # Primary degradation effects on C-MAPSS FD001 sensors:
        # Sensor 2 (T24, Fan Inlet Temp): mild upward drift
        s["sensor_2"] += self.fan_wear * 3.5 + noise(0.2)
        # Sensor 3 (T30, Total temp at HPC outlet): increases with HPC fouling & thermal distress
        s["sensor_3"] += self.hpc_wear * 32.0 + self.thermal_stress_multiplier * 4.0 + noise(1.2)
        # Sensor 4 (T50, Total temp at LPT outlet): major degradation signal, rises as HPT/LPT wear
        s["sensor_4"] += self.hpt_wear * 38.0 + self.lpt_wear * 18.0 + noise(1.1)
        # Sensor 7 (P30, Total pressure at HPC outlet): drops as compressor efficiency drops
        s["sensor_7"] -= self.hpc_wear * 5.5 + noise(0.25)
        # Sensor 8 (Nf, Physical fan speed): slight drift
        s["sensor_8"] += self.fan_wear * 1.2 + noise(0.08)
        # Sensor 9 (Nc, Core speed / LPT coolant flow): increases significantly with degradation
        s["sensor_9"] += (self.hpt_wear * 70.0 + self.hpc_wear * 35.0) + noise(4.5)
        # Sensor 11 (Ps30, Static pressure at HPC outlet): increases with backpressure and wear
        s["sensor_11"] += self.hpc_wear * 1.4 + noise(0.09)
        # Sensor 12 (phi, Ratio of fuel flow to Ps30): drops as combustion efficiency declines
        s["sensor_12"] -= (self.hpc_wear * 3.2 + self.hpt_wear * 2.0) + noise(0.18)
        # Sensor 13 (NRf, Corrected fan speed)
        s["sensor_13"] += noise(0.08)
        # Sensor 14 (NRc, Corrected core speed): drops substantially as core degrades
        s["sensor_14"] -= (self.hpc_wear * 65.0 + self.hpt_wear * 45.0) + noise(3.0)
        # Sensor 15 (BPR, Bypass ratio): rises with core flow resistance
        s["sensor_15"] += self.hpc_wear * 0.18 + noise(0.015)
        # Sensor 17 (htBleed, Bleed enthalpy): increases with internal leakage
        s["sensor_17"] += self.hpc_wear * 8.0 + noise(0.5)
        # Sensor 20 (W31, HPT coolant bleed): drops
        s["sensor_20"] -= self.hpt_wear * 1.4 + noise(0.07)
        # Sensor 21 (W32, LPT coolant bleed): drops
        s["sensor_21"] -= self.lpt_wear * 0.9 + noise(0.05)
        
        # Operational settings with slight jitter
        s["op_setting_1"] = round(float(self.nominal_sensors["op_setting_1"] + noise(0.0005)), 4)
        s["op_setting_2"] = round(float(self.nominal_sensors["op_setting_2"] + noise(0.0001)), 4)
        s["op_setting_3"] = 100.0
        
        # Round sensor readings
        for k in s:
            if k.startswith("sensor_"):
                s[k] = round(float(s[k]), 3)
                
        s["engine_id"] = self.engine_id
        s["cycle"] = self.cycle
        return s

    def _record_telemetry(self):
        reading = self._generate_sensor_readings()
        self.telemetry_history.append(reading)

    def get_subsystem_health(self) -> Dict[str, Dict[str, Any]]:
        """Return granular subsystem wear percentages and status."""
        def make_entry(wear: float):
            pct = round(wear * 100, 1)
            status = "HEALTHY" if pct < 35 else ("DEGRADED" if pct < 70 else "CRITICAL")
            return {"wear_pct": pct, "status": status}
            
        return {
            "Fan & LPC": make_entry(self.fan_wear),
            "High Pressure Compressor (HPC)": make_entry(self.hpc_wear),
            "Combustor Section": make_entry(self.combustor_wear),
            "High Pressure Turbine (HPT)": make_entry(self.hpt_wear),
            "Low Pressure Turbine (LPT)": make_entry(self.lpt_wear),
        }

    def get_prescriptive_recommendation(self) -> Dict[str, str]:
        """Generate domain-specific prescriptive maintenance recommendations."""
        max_wear = max(self.fan_wear, self.hpc_wear, self.combustor_wear, self.hpt_wear, self.lpt_wear)
        
        if max_wear >= 0.75:
            return {
                "action": "IMMEDIATE DEPOT REMOVAL",
                "urgency": "CRITICAL",
                "recommendation": "Engine approaching functional failure boundary. Remove from airframe for depot-level overhaul.",
                "flight_restriction": "AOG / Ferry flight only with restricted thrust rating."
            }
        elif self.hpt_wear >= 0.50 or self.combustor_wear >= 0.50:
            return {
                "action": "HOT SECTION INSPECTION & BLADE REPAIR",
                "urgency": "HIGH",
                "recommendation": "Borescope inspection of HPT stage 1 blades and combustor liner recommended within 10 flight cycles.",
                "flight_restriction": "Derate takeoff thrust by 10% to reduce thermal creep."
            }
        elif self.hpc_wear >= 0.40:
            return {
                "action": "COMPRESSOR CORE WATER WASH",
                "urgency": "MEDIUM",
                "recommendation": "Perform detergent core water wash to recover HPC tip efficiency and reduce EGT margin decay.",
                "flight_restriction": "Normal operation allowed; monitor EGT margin."
            }
        else:
            return {
                "action": "ROUTINE MONITORING",
                "urgency": "LOW",
                "recommendation": "All turbofan subsystems operating within nominal design envelope. Next scheduled A-check in 75 cycles.",
                "flight_restriction": "Unrestricted commercial operational envelope."
            }

    def get_current_state(self) -> Dict[str, Any]:
        """Comprehensive snapshot of the digital twin."""
        latest_telemetry = self.telemetry_history[-1]
        overall_wear = (self.fan_wear*0.1 + self.hpc_wear*0.3 + self.combustor_wear*0.15 + self.hpt_wear*0.35 + self.lpt_wear*0.1)
        health_index = max(0.0, 1.0 - overall_wear)
        
        return {
            "engine_id": self.engine_id,
            "cycle": self.cycle,
            "flight_hours": round(self.flight_hours, 1),
            "overall_health_index": round(health_index, 3),
            "stress_parameters": {
                "thermal_stress": self.thermal_stress_multiplier,
                "contamination": self.contamination_rate,
                "thrust_derate": self.thrust_derating
            },
            "subsystems": self.get_subsystem_health(),
            "prescriptive_maintenance": self.get_prescriptive_recommendation(),
            "latest_telemetry": latest_telemetry
        }

    def get_history_df(self) -> pd.DataFrame:
        """Return history as pandas DataFrame."""
        return pd.DataFrame(self.telemetry_history)
