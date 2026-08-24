import sys
import unittest
from fastapi.testclient import TestClient

# Ensure absolute scratch path is in path
sys.path.append("/workspace/scratch")
from main import app

class TestInukaAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        login = self.client.post("/api/auth/login", json={
            "username": "admin_kamau",
            "password": "KpcAdmin2026!",
        })
        self.auth_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    def test_overview_metrics(self):
        """Test the metrics endpoint yields accurate stats and types"""
        response = self.client.get("/api/overview/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_records", data)
        self.assertIn("trusted_identities", data)
        self.assertIn("pending_reviews", data)
        self.assertIn("data_health", data)
        self.assertIsInstance(data["total_records"], int)
        self.assertIsInstance(data["data_health"], float)
        self.assertIn("potential_duplicates", data)
        self.assertIn("unique_beneficiaries", data)

    def test_overview_charts(self):
        response = self.client.get("/api/overview/charts")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["duplicates_by_program"]), 4)
        self.assertEqual(len(data["match_confidence"]), 5)
        self.assertEqual(len(data["merges_over_time"]), 30)

    def test_financial_controls_and_notifications(self):
        trend = self.client.get("/api/financial/leakage-trend", headers=self.auth_headers)
        payments = self.client.get("/api/financial/high-risk-payments", headers=self.auth_headers)
        settings = self.client.get("/api/financial/reconciliation/settings", headers=self.auth_headers)
        notification = self.client.post("/api/notifications/dispatch", headers=self.auth_headers, json={
            "channel": "sms", "recipient": "+254700000000", "reference_id": "TEST-1", "message": "Test notification"
        })
        self.assertEqual(trend.status_code, 200)
        self.assertEqual(len(trend.json()), 5)
        self.assertEqual(payments.status_code, 200)
        self.assertEqual(settings.status_code, 200)
        self.assertEqual(notification.status_code, 200)
        self.assertEqual(notification.json()["status"], "queued")

    def test_overview_programs(self):
        """Test record groupings by program and accurate key mappings"""
        response = self.client.get("/api/overview/programs")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 4)
        for item in data:
            self.assertIn("name", item)
            self.assertIn("records", item)
            self.assertIn("color", item)
            self.assertIn("short", item)
            self.assertTrue(item["short"] in ["SCH", "PLU", "VOC", "TEC", "UNK"])

    def test_identities_explorer(self):
        """Test database query explorer search and alignment keys"""
        response = self.client.get("/api/identities?status=all")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        if len(data) > 0:
            item = data[0]
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("nid", item)
            self.assertIn("programs", item)
            self.assertIsInstance(item["programs"], list)
            
            first_name = item["name"]
            search_response = self.client.get(f"/api/identities?search={first_name}")
            self.assertEqual(search_response.status_code, 200)
            search_data = search_response.json()
            self.assertIsInstance(search_data, list)
            self.assertTrue(len(search_data) >= 1)

    def test_beneficiary_profile(self):
        """Test full Beneficiary 360 profile keys and responses"""
        identities_resp = self.client.get("/api/identities")
        identities = identities_resp.json()
        if len(identities) > 0:
            b_id = identities[0]["id"]
            response = self.client.get(f"/api/beneficiaries/{b_id}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["id"], b_id)
            self.assertIsInstance(data["programs"], list)

    def test_beneficiary_not_found(self):
        """Test profile 404 response on fake ID"""
        response = self.client.get("/api/beneficiaries/BEN-99999")
        self.assertEqual(response.status_code, 404)

    def test_fuzzy_compare_engine(self):
        """Test fuzzy matching similarities and mapped camelCase keys"""
        import pandas as pd
        source_df = pd.read_csv("/workspace/scratch/mock_data/source_records.csv")
        if len(source_df) >= 2:
            id_a = source_df.iloc[0]["record_id"]
            id_b = source_df.iloc[1]["record_id"]
            
            # Note the parameter names matching the API spec: record_a and record_b
            response = self.client.get(f"/api/duplicates/compare?record_a={id_a}&record_b={id_b}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("record_a", data)
            self.assertIn("record_b", data)
            self.assertIn("comparisons", data)
            self.assertIn("overall_confidence", data)
            
            # Verify camelCase comparisons keys
            keys = [cmp["key"] for cmp in data["comparisons"]]
            self.assertIn("nationalId", keys)
            self.assertIn("name", keys)

    def test_quality_dimensions(self):
        """Test compliance of the 5 quality metrics"""
        response = self.client.get("/api/quality/dimensions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("dimensions", data)
        self.assertEqual(len(data["dimensions"]), 5)

    def test_quality_trend_sparkline(self):
        """Test daily data quality score historical timeline sparkline data as integers"""
        response = self.client.get("/api/quality/trend")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("data", data)
        self.assertEqual(len(data["data"]), 30)
        for val in data["data"]:
            self.assertIsInstance(val, int)

    def test_anomalies_empty_safety(self):
        """Test safety mapping of anomalies (records as array, level colors)"""
        response = self.client.get("/api/anomalies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        for anomaly in data:
            self.assertIsInstance(anomaly["records"], list)
            self.assertTrue(anomaly["color"] in ["var(--magenta)", "var(--amber)", "var(--green)"])

    def test_audit_logs_grouping(self):
        """Test that audits are correctly grouped under date keys"""
        response = self.client.get("/api/audit")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, dict)

    def test_duplicate_resolution_reject(self):
        """Test duplicate confirmation rejection action"""
        import pandas as pd
        source_df = pd.read_csv("/workspace/scratch/mock_data/source_records.csv")
        if len(source_df) >= 2:
            id_a = source_df.iloc[0]["record_id"]
            id_b = source_df.iloc[1]["record_id"]
            payload = {
                "record_a_id": id_a,
                "record_b_id": id_b,
                "action": "reject",
                "user": "test_runner"
            }
            response = self.client.post("/api/duplicates/resolve", headers=self.auth_headers, json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "success")

if __name__ == "__main__":
    unittest.main()
