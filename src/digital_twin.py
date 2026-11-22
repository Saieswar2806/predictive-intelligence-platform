import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from src.data import INFORMATIVE_SENSORS

class TurbofanDigitalTwin:
    """
    High-Fidelity Physics-Guided Turbofan Digital Twin Simulation.
    Simulates real-time multi-stage degradation, synthetic multi-sensor telemetry generation,
    what-if operational stress scenarios, and prescriptive maintenance recommendations.

    NOTE & DISCLAIMER:
    This is an educational, physics-guided degradation benchmark simulation calibrated against
    NASA C-MAPSS FD001 empirical degradation trajectories (such as T50/sensor_4 rise, P30/sensor_7
    decay, and core speed drift). It is NOT an FAA/EASA-certified physical aircraft engine flight
    dynamics model or primary airworthiness control instrument. All generated telemetry is explicitly
    tagged as synthetic.
    """
    def __init__(
        self,
        engine_id: int = 1,
        initial_cycle: int = 1,
        base_max_life: int = 220,
        seed: Optional[int] = None
    ):
        self.engine_id = engine_id
        self.cycle = initial_cycle
        self.flight_hours = initial_cycle * 2.4
        self.base_max_life = base_max_life
        self.rng = np.random.RandomState(seed) if seed is not None else np.random.RandomState()
        
        # Subsystem health wear states (0.0 = pristine nominal, 1.0 = functional failure boundary)
        self.fan_wear = 0.02
        self.hpc_wear = 0.03        # High pressure compressor fouling/blade erosion
        self.combustor_wear = 0.01  # Combustor liner thermal distress & nozzle coking
        self.hpt_wear = 0.04        # High pressure turbine blade thermal creep & tip erosion
        self.lpt_wear = 0.02        # Low pressure turbine blade degradation
        
        # Environmental and Operational Modifiers (What-If stress parameters)
        self.thermal_stress_multiplier = 1.0     # 1.0 = ISA nominal standard, 1.5 = high OAT / desert
        self.contamination_rate = 1.0            # 1.0 = clean air, 2.0 = sand/dust/volcanic particulates
        self.thrust_derating = 0.0               # 0.0 = full rated takeoff thrust, 0.15 = 15% derated
        
        # Baseline reference telemetry (healthy operational cycle 1 in FD001 nominal flight envelope)
        self.nominal_sensors = {
            "op_setting_1": 0.0015, "op_setting_2": 0.0003, "op_setting_3": 100.0,
            "sensor_1": 518.67, "sensor_2": 642.15, "sensor_3": 1585.0, "sensor_4": 1400.5,
            "sensor_5": 14.62, "sensor_6": 21.61, "sensor_7": 554.2, "sensor_8": 2388.06,
            "sensor_9": 9050.0, "sensor_10": 1.30, "sensor_11": 47.15, "sensor_12": 521.8,
            "sensor_13": 2388.05, "sensor_14": 8138.5, "sensor_15": 8.41, "sensor_16": 0.03,
            "sensor_17": 391.0, "sensor_18": 2388.0, "sensor_19": 100.0, "sensor_20": 38.9,
            "sensor_21": 23.35
        }
        
        self.telemetry_history: List[Dict[str, Any]] = []
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
        Simulate real-world maintenance actions and quantify subsystem wear recovery:
        - 'compressor_wash': Recovers ~55% of HPC aerodynamic fouling.
        - 'hot_section_inspection': Borescope + turbine recoating, recovers ~40% of HPT thermal wear.
        - 'major_overhaul': Full depot-level rebuild, resets all turbofan subsystems to pristine.
        """
        recovery_log = ""
        action_clean = action.lower().strip()
        if action_clean == "compressor_wash":
            old_hpc = self.hpc_wear
            self.hpc_wear = max(0.02, self.hpc_wear * 0.45)
            recovery_log = f"Compressor detergent wash completed. HPC fouling index reduced from {old_hpc:.2f} to {self.hpc_wear:.2f}."
        elif action_clean == "hot_section_inspection":
            old_hpt = self.hpt_wear
            self.hpt_wear = max(0.03, self.hpt_wear * 0.60)
            recovery_log = f"Hot section inspection & blade recoating completed. HPT wear reduced from {old_hpt:.2f} to {self.hpt_wear:.2f}."
        elif action_clean == "major_overhaul":
            self.fan_wear = 0.02
            self.hpc_wear = 0.03
            self.combustor_wear = 0.01
            self.hpt_wear = 0.04
            self.lpt_wear = 0.02
            recovery_log = "Full depot-level engine overhaul completed. All subsystems restored to nominal baseline."
        else:
            recovery_log = f"Unknown maintenance action: '{action}'. No subsystem wear recovered."
            
        self._record_telemetry()
        return {
            "action": action,
            "summary": recovery_log,
            "subsystems": self.get_subsystem_health(),
            "telemetry_source": "physics_simulation_synthetic",
            "is_synthetic": True
        }

    def step(self, cycles: int = 1, seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Advance the digital twin by `cycles`.
        Propagates physical wear models and generates new telemetry measurements.
        If `seed` is provided, guarantees deterministic output reproducibility.
        """
        if seed is not None:
            self.rng = np.random.RandomState(seed)

        for _ in range(cycles):
            self.cycle += 1
            self.flight_hours += 2.4
            
            # Non-linear exponential degradation rate modified by What-If stress parameters
            base_rate = (self.cycle / self.base_max_life) ** 2.2 * 0.006
            effective_rate = base_rate * self.thermal_stress_multiplier * self.contamination_rate * (1.0 - self.thrust_derating * 1.5)
            
            # Subsystem wear propagation with controlled noise
            self.fan_wear = min(1.0, max(0.0, self.fan_wear + effective_rate * 0.7 + self.rng.normal(0, 0.0003)))
            self.hpc_wear = min(1.0, max(0.0, self.hpc_wear + effective_rate * 1.3 * self.contamination_rate + self.rng.normal(0, 0.0005)))
            self.combustor_wear = min(1.0, max(0.0, self.combustor_wear + effective_rate * 0.9 * self.thermal_stress_multiplier + self.rng.normal(0, 0.0003)))
            self.hpt_wear = min(1.0, max(0.0, self.hpt_wear + effective_rate * 1.5 * self.thermal_stress_multiplier + self.rng.normal(0, 0.0006)))
            self.lpt_wear = min(1.0, max(0.0, self.lpt_wear + effective_rate * 0.8 + self.rng.normal(0, 0.0004)))
            
            self._record_telemetry()
            
        return self.get_current_state()

    def _generate_sensor_readings(self) -> Dict[str, Any]:
        """
        Generate physics-consistent synthetic sensor values driven by subsystem degradation states.
        Empirically calibrated against NASA C-MAPSS FD001 sensor trends.
        """
        s = dict(self.nominal_sensors)
        noise = lambda sigma: float(self.rng.normal(0, sigma))
        
        # Primary degradation effects on C-MAPSS FD001 sensors:
        # Sensor 2 (T24, Fan Inlet Temp): mild upward drift with fan wear
        s["sensor_2"] += self.fan_wear * 3.5 + noise(0.2)
        # Sensor 3 (T30, Total temp at HPC outlet): increases with HPC fouling & thermal distress
        s["sensor_3"] += self.hpc_wear * 32.0 + self.thermal_stress_multiplier * 4.0 + noise(1.2)
        # Sensor 4 (T50, Total temp at LPT outlet): major degradation signal, rises as HPT/LPT wear
        s["sensor_4"] += self.hpt_wear * 38.0 + self.lpt_wear * 18.0 + noise(1.1)
        # Sensor 7 (P30, Total pressure at HPC outlet): drops as compressor efficiency decays
        s["sensor_7"] -= self.hpc_wear * 5.5 + noise(0.25)
        # Sensor 8 (Nf, Physical fan speed): slight drift
        s["sensor_8"] += self.fan_wear * 1.2 + noise(0.08)
        # Sensor 9 (Nc, Core speed / coolant flow): increases significantly with degradation
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
        # Sensor 20 (W31, HPT coolant bleed): drops with seal decay
        s["sensor_20"] -= self.hpt_wear * 1.4 + noise(0.07)
        # Sensor 21 (W32, LPT coolant bleed): drops
        s["sensor_21"] -= self.lpt_wear * 0.9 + noise(0.05)
        
        # Operational settings with slight natural flight jitter
        s["op_setting_1"] = round(float(self.nominal_sensors["op_setting_1"] + noise(0.0005)), 4)
        s["op_setting_2"] = round(float(self.nominal_sensors["op_setting_2"] + noise(0.0001)), 4)
        s["op_setting_3"] = 100.0
        
        # Round sensor readings
        for k in list(s.keys()):
            if k.startswith("sensor_"):
                s[k] = round(float(s[k]), 3)
                
        s["engine_id"] = self.engine_id
        s["cycle"] = self.cycle
        s["telemetry_source"] = "physics_simulation_synthetic"
        s["is_synthetic"] = True
        return s

    def _record_telemetry(self):
        reading = self._generate_sensor_readings()
        self.telemetry_history.append(reading)

    def get_subsystem_health(self) -> Dict[str, Dict[str, Any]]:
        """Return granular subsystem wear percentages, thermal distress, and status."""
        def make_entry(wear: float, name: str):
            pct = round(wear * 100, 1)
            status = "HEALTHY" if pct < 35 else ("DEGRADED" if pct < 70 else "CRITICAL")
            return {
                "subsystem": name,
                "wear_pct": pct,
                "wear_fraction": round(wear, 4),
                "status": status,
                "temperature_margin_loss_c": round(wear * 45.0, 1),
                "efficiency_loss_pct": round(wear * 7.5, 2)
            }
            
        return {
            "Fan & LPC": make_entry(self.fan_wear, "Fan & LPC"),
            "High Pressure Compressor (HPC)": make_entry(self.hpc_wear, "High Pressure Compressor (HPC)"),
            "Combustor Section": make_entry(self.combustor_wear, "Combustor Section"),
            "High Pressure Turbine (HPT)": make_entry(self.hpt_wear, "High Pressure Turbine (HPT)"),
            "Low Pressure Turbine (LPT)": make_entry(self.lpt_wear, "Low Pressure Turbine (LPT)"),
        }

    def compare_maintenance_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """
        Evaluate projected life extension across alternative maintenance strategies:
        1. No Action (continued current stress trajectory)
        2. Compressor Core Water Wash
        3. Hot Section Borescope Inspection & Blade Treatment
        4. Depot-Level Major Overhaul
        """
        current_overall_wear = (
            self.fan_wear * 0.1 + self.hpc_wear * 0.3 + 
            self.combustor_wear * 0.15 + self.hpt_wear * 0.35 + self.lpt_wear * 0.1
        )
        current_health_index = max(0.0, 1.0 - current_overall_wear)
        projected_baseline_rul = max(0, int(round((1.0 - current_overall_wear) * 110)))

        # 1. Compressor Wash scenario
        post_wash_hpc = max(0.02, self.hpc_wear * 0.45)
        wash_wear = (
            self.fan_wear * 0.1 + post_wash_hpc * 0.3 + 
            self.combustor_wear * 0.15 + self.hpt_wear * 0.35 + self.lpt_wear * 0.1
        )
        wash_rul = max(0, int(round((1.0 - wash_wear) * 110)))

        # 2. Hot Section Inspection scenario
        post_hsi_hpt = max(0.03, self.hpt_wear * 0.60)
        hsi_wear = (
            self.fan_wear * 0.1 + self.hpc_wear * 0.3 + 
            self.combustor_wear * 0.15 + post_hsi_hpt * 0.35 + self.lpt_wear * 0.1
        )
        hsi_rul = max(0, int(round((1.0 - hsi_wear) * 110)))

        # 3. Major Overhaul scenario
        overhaul_wear = 0.03
        overhaul_rul = 125

        return {
            "current_state": {
                "cycle": self.cycle,
                "current_health_index": round(current_health_index, 3),
                "projected_baseline_rul": projected_baseline_rul
            },
            "scenarios": {
                "no_action": {
                    "action_name": "No Immediate Action",
                    "estimated_rul_cycles": projected_baseline_rul,
                    "rul_extension_cycles": 0,
                    "downtime_hours": 0,
                    "subsystem_wear_change": "Continued nominal degradation",
                    "feasibility": "Standard flight operation"
                },
                "compressor_wash": {
                    "action_name": "Compressor Core Water Wash",
                    "estimated_rul_cycles": wash_rul,
                    "rul_extension_cycles": max(0, wash_rul - projected_baseline_rul),
                    "downtime_hours": 4,
                    "subsystem_wear_change": f"Recovers ~55% of HPC fouling (HPC wear drops from {self.hpc_wear*100:.1f}% to {post_wash_hpc*100:.1f}%)",
                    "feasibility": "Line maintenance hangar; fast turnaround"
                },
                "hot_section_inspection": {
                    "action_name": "Hot Section Borescope & Blade Treatment",
                    "estimated_rul_cycles": hsi_rul,
                    "rul_extension_cycles": max(0, hsi_rul - projected_baseline_rul),
                    "downtime_hours": 24,
                    "subsystem_wear_change": f"Recovers ~40% of HPT thermal wear (HPT wear drops from {self.hpt_wear*100:.1f}% to {post_hsi_hpt*100:.1f}%)",
                    "feasibility": "Scheduled base maintenance check"
                },
                "major_overhaul": {
                    "action_name": "Depot-Level Engine Overhaul",
                    "estimated_rul_cycles": overhaul_rul,
                    "rul_extension_cycles": max(0, overhaul_rul - projected_baseline_rul),
                    "downtime_hours": 360,
                    "subsystem_wear_change": "Complete module reset to pristine manufacturing baseline (Wear <= 3%)",
                    "feasibility": "Depot shop visit required"
                }
            }
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
        """Comprehensive snapshot of the digital twin with explicit synthetic provenance."""
        latest_telemetry = self.telemetry_history[-1]
        overall_wear = (
            self.fan_wear * 0.1 + self.hpc_wear * 0.3 + 
            self.combustor_wear * 0.15 + self.hpt_wear * 0.35 + self.lpt_wear * 0.1
        )
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
            "maintenance_scenarios": self.compare_maintenance_scenarios(),
            "latest_telemetry": latest_telemetry,
            "provenance": {
                "telemetry_source": "physics_simulation_synthetic",
                "is_synthetic": True,
                "calibration_baseline": "NASA C-MAPSS FD001",
                "airworthiness_certified": False,
                "disclaimer": "Educational engineering digital twin. Not certified for flight operations."
            }
        }

    def get_history_df(self) -> pd.DataFrame:
        """Return history as pandas DataFrame."""
        return pd.DataFrame(self.telemetry_history)
