import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.api.deps import get_dataframes


@pytest.fixture(scope="session")
def dataframes():
    """Get the dataframes singleton for testing."""
    dfs = get_dataframes()
    dfs.load_data()
    return dfs


@pytest.fixture(scope="session")
def client():
    """Create a test client."""
    from httpx import AsyncClient, ASGITransport
    from main import app

    async def _client():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    return _client


@pytest.fixture
def sample_beneficiary_id(dataframes):
    """Get a sample beneficiary ID for testing."""
    if not dataframes.beneficiaries_df.empty:
        return dataframes.beneficiaries_df.iloc[0]["beneficiary_id"]
    return "BEN-10000"


@pytest.fixture
def sample_record_ids(dataframes):
    """Get sample record IDs for testing."""
    if not dataframes.source_records_df.empty:
        return dataframes.source_records_df.iloc[0]["record_id"], dataframes.source_records_df.iloc[1]["record_id"]
    return "REC-SCH-10001", "REC-PLU-10002"