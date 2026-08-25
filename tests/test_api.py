import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport


@pytest_asyncio.fixture
async def async_client():
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealth:
    async def test_health_endpoint(self, async_client):
        response = await async_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "data_freshness" in data


class TestOverview:
    async def test_overview_metrics(self, async_client):
        response = await async_client.get("/api/v1/overview/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert "trusted_identities" in data
        assert "data_health" in data

    async def test_overview_charts(self, async_client):
        response = await async_client.get("/api/v1/overview/charts")
        assert response.status_code == 200
        data = response.json()
        assert "duplicates_by_program" in data
        assert "beneficiaries_by_program" in data
        assert "match_confidence" in data
        assert "merges_over_time" in data

    async def test_program_metrics(self, async_client):
        response = await async_client.get("/api/v1/overview/programs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for prog in data:
            assert "name" in prog
            assert "records" in prog
            assert "short" in prog


class TestIdentities:
    async def test_identities_list(self, async_client):
        response = await async_client.get("/api/v1/identities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            identity = data[0]
            assert "id" in identity
            assert "name" in identity
            assert "programs" in identity
            assert "confidence" in identity
            assert "status" in identity

    async def test_identities_with_filter(self, async_client):
        response = await async_client.get("/api/v1/identities?status=Verified")
        assert response.status_code == 200
        data = response.json()
        for identity in data:
            assert identity["status"] == "Verified"

    async def test_identities_with_search(self, async_client):
        response = await async_client.get("/api/v1/identities?search=Grace")
        assert response.status_code == 200
        data = response.json()
        # Search should return results (or empty list if no match)
        assert isinstance(data, list)


class TestDuplicates:
    async def test_compare_records(self, async_client, dataframes):
        # Use real record IDs from the data
        if dataframes.source_records_df.empty:
            pytest.skip("No source records loaded")

        rec_a = dataframes.source_records_df.iloc[0]["record_id"]
        rec_b = dataframes.source_records_df.iloc[1]["record_id"]

        response = await async_client.get(f"/api/v1/duplicates/compare?record_a={rec_a}&record_b={rec_b}")
        assert response.status_code == 200
        data = response.json()
        assert "record_a" in data
        assert "record_b" in data
        assert "comparisons" in data
        assert "overall_confidence" in data
        assert len(data["comparisons"]) == 5

    async def test_compare_invalid_records(self, async_client):
        response = await async_client.get("/api/v1/duplicates/compare?record_a=INVALID&record_b=INVALID2")
        assert response.status_code == 404


class TestAnomalies:
    async def test_anomalies_list(self, async_client):
        response = await async_client.get("/api/v1/anomalies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            anomaly = data[0]
            assert "id" in anomaly
            assert "title" in anomaly
            assert "level" in anomaly
            assert "records" in anomaly


class TestQuality:
    async def test_quality_dimensions(self, async_client):
        response = await async_client.get("/api/v1/quality/dimensions")
        assert response.status_code == 200
        data = response.json()
        assert "dimensions" in data
        assert isinstance(data["dimensions"], list)

    async def test_quality_trend(self, async_client):
        response = await async_client.get("/api/v1/quality/trend")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) == 30


class TestAuth:
    async def test_login_valid(self, async_client):
        response = await async_client.post("/api/v1/auth/login", json={
            "username": "admin_kamau",
            "password": "KpcAdmin2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data

    async def test_login_invalid(self, async_client):
        response = await async_client.post("/api/v1/auth/login", json={
            "username": "admin_kamau",
            "password": "wrongpassword"
        })
        assert response.status_code == 401