from typing import Generator
import pandas as pd
import os
from app.config import get_settings


class DataFrames:
    def __init__(self):
        self.beneficiaries_df = pd.DataFrame()
        self.source_records_df = pd.DataFrame()
        self.audit_logs_df = pd.DataFrame()
        self.anomalies_df = pd.DataFrame()
        self.quality_dimensions_df = pd.DataFrame()
        self._loaded = False

    def load_data(self):
        settings = get_settings()
        mock_data_dir = settings.mock_data_path

        def get_file_path(filename: str) -> str:
            return os.path.join(mock_data_dir, filename)

        try:
            self.beneficiaries_df = pd.read_csv(get_file_path("beneficiaries.csv"))
            self.source_records_df = pd.read_csv(get_file_path("source_records.csv"))
            self.audit_logs_df = pd.read_csv(get_file_path("audit_logs.csv"))
            self.anomalies_df = pd.read_csv(get_file_path("anomalies.csv"))
            self.quality_dimensions_df = pd.read_csv(get_file_path("quality_dimensions.csv"))
            self._loaded = True
        except Exception as e:
            print(f"Error loading datasets: {e}")
            self.beneficiaries_df = pd.DataFrame()
            self.source_records_df = pd.DataFrame()
            self.audit_logs_df = pd.DataFrame()
            self.anomalies_df = pd.DataFrame()
            self.quality_dimensions_df = pd.DataFrame()
            self._loaded = False


_dataframes = DataFrames()


def get_dataframes() -> DataFrames:
    return _dataframes


def get_mock_data_dir() -> str:
    return get_settings().mock_data_path


def get_file_path(filename: str) -> str:
    return os.path.join(get_mock_data_dir(), filename)