from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ApiContract:
    key: str
    operation_id: str
    method: str
    path: str
    controller: str
    action: str


class ContractRegistry:
    def __init__(self, contracts: dict[str, ApiContract]) -> None:
        self._contracts = contracts

    def get(self, key: str) -> ApiContract:
        try:
            return self._contracts[key]
        except KeyError as exc:
            raise KeyError(f"Unknown API contract: {key}") from exc

    def values(self) -> list[ApiContract]:
        return list(self._contracts.values())

    def find_by_http(self, method: str, path: str) -> ApiContract | None:
        normalized_method = method.upper()
        return next(
            (
                contract
                for contract in self._contracts.values()
                if contract.method == normalized_method and contract.path == path
            ),
            None,
        )

    @classmethod
    def load(cls) -> "ContractRegistry":
        candidates = [
            Path(__file__).resolve().parents[3] / "contracts" / "api-contracts.json",
            Path("/contracts/api-contracts.json"),
            Path.cwd().parent / "contracts" / "api-contracts.json",
        ]
        source = next((path for path in candidates if path.exists()), None)
        if source is None:
            raise FileNotFoundError("contracts/api-contracts.json was not found")
        raw = json.loads(source.read_text(encoding="utf-8"))
        contracts = {
            key: ApiContract(
                key=key,
                operation_id=value["operationId"],
                method=value["method"],
                path=value["path"],
                controller=value["controller"],
                action=value["action"],
            )
            for key, value in raw.items()
        }
        return cls(contracts)


@lru_cache
def get_contract_registry() -> ContractRegistry:
    return ContractRegistry.load()
