import argparse
import csv
from datetime import datetime
import io
import json
import re
import shutil
import sys
import tempfile
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

BASE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_{year}.zip"
PHOTO_URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{year}/fotos/foto_cand{year}_{state}_div.zip"
DATASET_URL = "https://dadosabertos.tse.jus.br/dataset/candidatos-{year}"
OFFICES = {
    2022: {
        "PRESIDENTE": "Presidente da República",
        "GOVERNADOR": "Governador",
        "DEPUTADO ESTADUAL": "Deputado estadual",
        "DEPUTADO DISTRITAL": "Deputado distrital",
    },
    2024: {
        "PREFEITO": "Prefeito",
        "VEREADOR": "Vereador",
    },
}
PARTICLES = {"da", "das", "de", "do", "dos", "e"}


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "VozCidada/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output)


def get_archive(filename: str, url: str, cache_dir: Path | None, temp_dir: Path) -> Path:
    cached = cache_dir / filename if cache_dir else None
    if cached and cached.is_file():
        return cached
    destination = temp_dir / filename
    print(f"Baixando {url}")
    download(url, destination)
    return destination


def normalized(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().upper()


def title_case(value: str) -> str:
    parts = value.strip().lower().split()
    return " ".join(
        part if index and part in PARTICLES else part[:1].upper() + part[1:]
        for index, part in enumerate(parts)
    )


def read_elected_rows(archive_path: Path, year: int) -> list[dict[str, str]]:
    member = f"consulta_cand_{year}_BRASIL.csv"
    elected: dict[tuple[str, str], dict[str, str]] = {}
    with zipfile.ZipFile(archive_path) as archive, archive.open(member) as source:
        rows = csv.DictReader(io.TextIOWrapper(source, encoding="cp1252", newline=""), delimiter=";")
        required = {"SQ_CANDIDATO", "NM_URNA_CANDIDATO", "SG_UF", "SG_UE", "NM_UE", "SG_PARTIDO", "DS_CARGO", "DS_SIT_TOT_TURNO", "DT_ELEICAO"}
        missing = required.difference(rows.fieldnames or [])
        if missing:
            raise ValueError(f"O arquivo TSE {year} não contém as colunas esperadas: {', '.join(sorted(missing))}")
        for row in rows:
            office = OFFICES[year].get(row["DS_CARGO"].strip().upper())
            if not office or not normalized(row["DS_SIT_TOT_TURNO"]).startswith("ELEITO"):
                continue
            candidate_id = row["SQ_CANDIDATO"].strip()
            if not candidate_id:
                continue
            try:
                election_date = datetime.strptime(row["DT_ELEICAO"], "%d/%m/%Y")
            except ValueError as error:
                raise ValueError(f"O TSE retornou uma data de eleição inválida para o candidato {candidate_id}.") from error
            key = (candidate_id, office)
            previous = elected.get(key)
            if previous is None or election_date > datetime.strptime(previous["DT_ELEICAO"], "%d/%m/%Y"):
                elected[key] = row

    if year == 2024:
        latest_mayor_winners: dict[tuple[str, str], dict[str, str]] = {}
        for row in elected.values():
            office = OFFICES[year].get(row["DS_CARGO"].strip().upper())
            if office != "Prefeito":
                continue
            key = (row["SG_UF"].strip().upper(), row["SG_UE"].strip())
            previous = latest_mayor_winners.get(key)
            if previous is None or datetime.strptime(row["DT_ELEICAO"], "%d/%m/%Y") > datetime.strptime(previous["DT_ELEICAO"], "%d/%m/%Y"):
                latest_mayor_winners[key] = row
        elected = {
            (row["SQ_CANDIDATO"].strip(), OFFICES[year][row["DS_CARGO"].strip().upper()]): row
            for row in elected.values()
            if OFFICES[year].get(row["DS_CARGO"].strip().upper()) != "Prefeito"
        } | {
            (row["SQ_CANDIDATO"].strip(), OFFICES[year][row["DS_CARGO"].strip().upper()]): row
            for row in latest_mayor_winners.values()
        }

    term = "2023-2026" if year == 2022 else "2025-2028"
    result = []
    for (candidate_id, office), row in elected.items():
        is_municipal = office in {"Prefeito", "Vereador"}
        election_year = datetime.strptime(row["DT_ELEICAO"], "%d/%m/%Y").year
        result.append({
            "id": f"tse-{year}-{candidate_id}",
            "name": title_case(
                row["NM_CANDIDATO"] if office == "Presidente da República" else row["NM_URNA_CANDIDATO"]
            ),
            "party": row["SG_PARTIDO"].strip(),
            "state": row["SG_UF"].strip().upper(),
            "municipality": title_case(row["NM_UE"]) if is_municipal else None,
            "municipalityCode": row["SG_UE"].strip() if is_municipal else None,
            "office": office,
            "photoUrl": None,
            "profileUrl": "https://divulgacandcontas.tse.jus.br/",
            "electionYear": election_year,
            "term": term,
            "sourceUrl": DATASET_URL.format(year=year),
        })
    return result


def add_candidate_photos(
    records: list[dict[str, object]],
    year: int,
    states: set[str],
    cache_dir: Path | None,
    temp_dir: Path,
    output_dir: Path,
) -> int:
    if year == 2022:
        targets = [
            row for row in records
            if row["office"] == "Presidente da República"
            or (row["state"] in states and row["office"] in {"Governador", "Deputado estadual", "Deputado distrital"})
        ]
        photo_states = {"BR"} | {str(row["state"]) for row in targets if row["office"] != "Presidente da República"}
    else:
        targets = [row for row in records if row["state"] in states and row["office"] == "Prefeito"]
        photo_states = {str(row["state"]) for row in targets}

    photos_dir = output_dir / "official-photos"
    photos_dir.mkdir(parents=True, exist_ok=True)
    target_by_id = {str(row["id"].rsplit("-", 1)[-1]): row for row in targets}
    saved = 0
    for state in sorted(photo_states):
        filename = f"foto_cand{year}_{state}_div.zip"
        url = PHOTO_URL.format(year=year, state=state)
        archive_path = get_archive(filename, url, cache_dir, temp_dir)
        with zipfile.ZipFile(archive_path) as archive:
            for member in archive.namelist():
                match = re.search(r"(\d+)_div\.(?:jpe?g|png)$", Path(member).name, re.IGNORECASE)
                if not match:
                    continue
                record = target_by_id.get(match.group(1))
                if not record or record["state"] != state and record["office"] != "Presidente da República":
                    continue
                output_name = f"{year}-{match.group(1)}.jpg"
                with archive.open(member) as source, (photos_dir / output_name).open("wb") as output:
                    shutil.copyfileobj(source, output)
                record["photoUrl"] = f"/data/official-photos/{output_name}"
                saved += 1
    return saved


def write_json(path: Path, records: list[dict[str, object]]) -> None:
    records.sort(key=lambda row: (
        str(row["state"]),
        str(row["municipality"] or ""),
        str(row["name"]),
    ))
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(records, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Gera a lista de eleitos a partir dos dados abertos oficiais do TSE.")
    parser.add_argument("--cache-dir", type=Path, help="Usa arquivos ZIP TSE já baixados neste diretório.")
    parser.add_argument("--photo-states", default="RN", help="UFs para incluir retratos TSE de cargos estaduais e prefeitos (padrão: RN).")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parents[1] / "public" / "data")
    args = parser.parse_args()
    cache_dir = args.cache_dir.resolve() if args.cache_dir else None
    states = {part.strip().upper() for part in args.photo_states.split(",") if part.strip()}
    if any(not re.fullmatch(r"[A-Z]{2}", state) for state in states):
        parser.error("--photo-states deve conter siglas de UFs separadas por vírgula.")

    with tempfile.TemporaryDirectory(prefix="voz-cidada-tse-") as temp:
        temp_dir = Path(temp)
        archives = {
            year: get_archive(
                f"consulta_cand_{year}.zip",
                BASE_URL.format(year=year),
                cache_dir,
                temp_dir,
            )
            for year in (2022, 2024)
        }
        elected = {year: read_elected_rows(path, year) for year, path in archives.items()}
        photo_counts = {
            year: add_candidate_photos(rows, year, states, cache_dir, temp_dir, args.output_dir)
            for year, rows in elected.items()
        }
        for year, rows in elected.items():
            write_json(args.output_dir / f"elected-politicians-{year}.json", rows)
            print(f"{year}: {len(rows):,} eleitos; {photo_counts[year]:,} retratos oficiais incluídos.")


if __name__ == "__main__":
    main()
