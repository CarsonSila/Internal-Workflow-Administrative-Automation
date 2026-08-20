#!/usr/bin/env python3
"""
====================================================================================
 HACKATHON 2 — DIRTY MULTI-PROGRAMME DATASET GENERATOR
====================================================================================
 Generates four realistic, intentionally dirty programme datasets for entity
 resolution and data-integration practice:

   1. Inuka Scholarship Program                    (SCH)
   2. Inuka Vocational Youth Empowerment Programme (VOC)
   3. Inuka Plus                                  (PLUS)
   4. Inuka Tech Fellowship                       (TECH)

 Each programme contains exactly 1,500 public records (6,000 total).

 The generator is built around a CANONICAL MASTER POPULATION.  Every public
 record maps to exactly one canonical person.  The canonical national ID is the
 authoritative identity key and is the only attribute guaranteed to be stable
 across programmes (modulo deliberate formatting variation and a small,
 controlled number of transcription errors).

 Usage:
     pip install -r requirements.txt
     python generate_datasets.py --seed 42 --output ./output

 Reproducible: the same seed always produces the same datasets.
====================================================================================
"""

import argparse
import random
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# ====================================================================================
# CONFIGURATION — tune the hackathon datasets here without rewriting the generator
# ====================================================================================

CONFIG = {
    "rows_per_programme": 1500,
    "random_seed": 42,
    "min_dirty_percentage": 0.15,        # 15%
    "max_dirty_percentage": 0.25,        # 25%
    "max_generation_attempts": 20,
    "target_canonical_people": 3000,
    # Row budget ratios (base + false matches + duplicates = 100%)
    "duplicate_target_ratio": 0.20,      # duplicates = 20% of rows  (15-25% required)
    "false_match_ratio": 0.05,           # false matches = 5% of rows
    # Geography dirty split
    "geography_formatting_percentage": 0.11,     # ~11% formatting inconsistencies
    "geography_genuine_error_percentage": 0.05,  # ~5% genuinely wrong county/ward combos
    "geography_min_percentage": 0.12,            # combined validation floor
    "geography_max_percentage": 0.20,            # combined validation ceiling
    "duplicate_min_percentage": 0.15,
    "duplicate_max_percentage": 0.25,
    "missing_id_percentage": 0.02,               # ~2% controlled missing national IDs
    "id_transcription_error_percentage": 0.02,   # ~2% genuine ID transcription slips
    # Assignment weights (programmes per person)
    "assign_weights": {1: 0.30, 2: 0.40, 3: 0.20, 4: 0.10},
    # Email domain weights
    "email_domains": [("gmail.com", 0.50), ("yahoo.com", 0.20),
                      ("outlook.com", 0.15), ("hotmail.com", 0.15)],
    # One Bernoulli roll per dirty category (target 15-25% each; overlap allowed).
    # Base-record probabilities are set LOW because duplicate records (~20% of rows)
    # legitimately re-introduce name/phone/id/formatting variations on top.
    "dirty_prob": {
        "missing": 0.20,
        "formatting": 0.09,
        "typo": 0.15,
        "phone_variation": 0.05,
        "name_variation": 0.10,
        "id_variation": 0.10,
        "address_change": 0.06,          # person "moved" (realism; NOT a category)
    },
    # Name variation style weights (used when the name_variation roll fires)
    "name_style_weights": {
        "upper": 0.14, "lower": 0.10, "reversed": 0.14, "comma": 0.12,
        "initials": 0.10, "extra_spaces": 0.10, "missing_space": 0.06,
        "middle_initial": 0.06, "double_cap": 0.06, "title": 0.06, "clean": 0.06,
    },
    # Phone style weights (used when the phone_variation roll fires)
    "phone_style_weights": {
        "local": 0.10, "international": 0.22, "no_prefix": 0.10,
        "spaced": 0.12, "dashed": 0.12, "dotted": 0.08,
        "international_spaced": 0.14, "local_spaced": 0.06, "local_dashed": 0.06,
    },
    # ID style weights (used when the id_variation roll fires; plain NOT included here)
    "id_style_weights": {
        "spaced": 0.30, "dashed": 0.30, "leading_space": 0.10, "trailing_space": 0.10,
        "hyphen_middle": 0.20,
    },
    # Date style weights (used when the formatting roll fires)
    "date_style_weights": {
        "iso": 0.25, "dmy_slash": 0.20, "dmy_dash": 0.15, "mdy_slash": 0.08,
        "d_mon_year": 0.12, "d-mon-yy": 0.06, "long_d_mon_yy": 0.06,
        "mdy_dash": 0.04, "yyyymmdd": 0.04,
    },
}

PROGRAMMES = {
    "SCH": {
        "name": "Inuka Scholarship Program",
        "filename": "inuka_scholarship_program.csv",
        "beneficiary_prefix": "SCH",
        "date_start": "2022-01-01",
        "date_end": "2025-12-31",
        "columns": {
            "beneficiary_id": "beneficiary_id",
            "name": "full_name",
            "id": "national_id",
            "phone": "phone_number",
            "email": "email",
            "dob": "date_of_birth",
            "gender": "gender",
            "county": "county",
            "sub_county": "sub_county",
            "ward": "ward",
            "address": "address",
            "reg_date": "registration_date",
            "status": "status",
        },
        "gender_values": ("Male", "Female"),
        "status_values": ("Active", "Inactive", "Pending"),
        "date_format": "%Y-%m-%d",
        "name_case": "title",
        "phone_format": "local",                # 07XXXXXXXX
        "missing_representations": ["NULL", "", "N/A"],
        "email_case": "lower",
    },
    "VOC": {
        "name": "Inuka Vocational Youth Empowerment Programme",
        "filename": "inuka_vocational_youth_empowerment_programme.csv",
        "beneficiary_prefix": "VOC",
        "date_start": "2023-01-01",
        "date_end": "2025-12-31",
        "columns": {
            "beneficiary_id": "beneficiary_id",
            "name": "full_name",
            "id": "id_number",
            "phone": "mobile",
            "email": "email_address",
            "dob": "date_of_birth",
            "gender": "gender",
            "county": "county",
            "sub_county": "sub_county",
            "ward": "ward",
            "address": "postal_address",
            "reg_date": "registration_date",
            "status": "status",
        },
        "gender_values": ("M", "F"),
        "status_values": ("ACTIVE", "INACTIVE"),
        "date_format": "%d/%m/%Y",
        "name_case": "upper",
        "phone_format": "international",        # +254XXXXXXXXX
        "missing_representations": ["N/A", "NA", "Not Provided"],
        "email_case": "mixed",
    },
    "PLUS": {
        "name": "Inuka Plus",
        "filename": "inuka_plus.csv",
        "beneficiary_prefix": "PLUS",
        "date_start": "2023-01-01",
        "date_end": "2026-12-31",
        "columns": {
            "beneficiary_id": "beneficiary_id",
            "name": "full_name",
            "id": "national_id_no",
            "phone": "mobile_number",
            "email": "email",
            "dob": "dob",
            "gender": "gender",
            "county": "county",
            "sub_county": "sub_county",
            "ward": "ward",
            "address": "address",
            "reg_date": "enrollment_date",
            "status": "status",
        },
        "gender_values": ("MALE", "FEMALE"),
        "status_values": ("active", "inactive", "pending"),
        "date_format": "%d-%m-%Y",
        "name_case": "lower",
        "phone_format": "spaced",               # 254 XXX XXX XXX
        "missing_representations": ["Not Provided", "Unknown", ""],
        "email_case": "lower",
    },
    "TECH": {
        "name": "Inuka Tech Fellowship",
        "filename": "inuka_tech_fellowship.csv",
        "beneficiary_prefix": "TECH",
        "date_start": "2024-01-01",
        "date_end": "2026-12-31",
        "columns": {
            "beneficiary_id": "beneficiary_id",
            "name": "full_name",
            "id": "identification_number",
            "phone": "telephone",
            "email": "email",
            "dob": "date_of_birth",
            "gender": "gender",
            "county": "county",
            "sub_county": "sub_county",
            "ward": "ward",
            "address": "address",
            "reg_date": "registration_date",
            "status": "status",
        },
        "gender_values": ("male", "female"),
        "status_values": ("A", "I"),
        "date_format": "%d-%b-%Y",
        "name_case": "mixed",
        "phone_format": "dashed",               # 07XX-XXX-XXX
        "missing_representations": ["", "NULL", "NA"],
        "email_case": "lower",
    },
}

# Programme-specific field definitions
PROGRAMME_FIELDS = {
    "SCH": [
        ("school_name", str),
        ("education_level", str),
        ("course", str),
        ("scholarship_amount", int),
        ("academic_year", str),
    ],
    "VOC": [
        ("training_center", str),
        ("training_area", str),
        ("skill_category", str),
        ("training_status", str),
        ("completion_status", str),
    ],
    "PLUS": [
        ("household_size", int),
        ("employment_status", str),
        ("monthly_income", int),
        ("support_type", str),
        ("beneficiary_category", str),
    ],
    "TECH": [
        ("tech_track", str),
        ("cohort", str),
        ("mentor", str),
        ("project_area", str),
        ("completion_status", str),
    ],
}

STATUS_SETS = {
    "SCH": ("Active", "Inactive", "Pending"),
    "VOC": ("ACTIVE", "INACTIVE"),
    "PLUS": ("active", "inactive", "pending"),
    "TECH": ("A", "I"),
}

# ====================================================================================
# EMBEDDED REFERENCE DATA — Kenyan names, geography, mentors, categories
# ====================================================================================

FIRST_NAMES = [
    # Kikuyu / Central Kenya
    "Wanjiku", "Kamau", "Wairimu", "Njoroge", "Wangari", "Gichuru", "Nyambura", "Mwangi",
    "Wambui", "Kariuki", "Wanjiru", "Kimani", "Wangeci", "Gathoni", "Njeri", "Maina",
    "Muthoni", "Waithera", "Njuguna", "Wachira", "Kinyua", "Wambugu", "Githinji", "Mugo",
    # Luo / Western Kenya
    "Otieno", "Akinyi", "Ochieng", "Adhiambo", "Omondi", "Atieno", "Odhiambo", "Awuor",
    "Owuor", "Anyango", "Onyango", "Achieng", "Okoth", "Auma", "Opiyo", "Awino",
    "Okello", "Awiti", "Oduya", "Aoko", "Ojwang", "Adoyo", "Okoth", "Awiti",
    # Luhya
    "Wekesa", "Naliaka", "Wanyonyi", "Nafula", "Wafula", "Nanjala", "Simiyu", "Nasimiyu",
    "Nekesa", "Wamalwa", "Mukhwana", "Masinde", "Khaemba", "Nabwire", "Namukhula", "Wabomba",
    # Kalenjin / Rift Valley
    "Kiprotich", "Chepkorir", "Kipchumba", "Jebet", "Kipkemoi", "Chepngeno", "Kiprop", "Jepchumba",
    "Kipkemboi", "Chepkirui", "Kipkirui", "Jepkoech", "Kipkoech", "Chepkoech", "Kipkorir", "Jepkorir",
    "Cherono", "Kipchirchir", "Kipngetich", "Chebet", "Kipsang", "Jebiwott", "Kiprono", "Cherotich",
    # Kamba / Eastern Kenya
    "Mwikali", "Mutua", "Mueni", "Musyoka", "Kaloki", "Mwende", "Mulwa", "Syombua",
    "Mumo", "Kioko", "Muthoka", "Mutisya", "Nduku", "Mwania", "Kasina", "Ndunge",
    "Kilonzo", "Mutheu", "Munyao", "Ndinda", "Muema", "Syokau", "Mutinda", "Kimeu",
    # Kisii
    "Ondieki", "Kerubo", "Momanyi", "Kemunto", "Nyaboke", "Ongeri", "Kwamboka", "Moraa",
    "Onditi", "Nyambane", "Ombati", "Kebaso", "Mokua", "Onsongo", "Mogaka", "Bosibori",
    # Meru / Embu
    "Kaimenyi", "Gitonga", "Kagendo", "Muriuki", "Kanana", "Mutwiri", "Gakii",
    "Muthuri", "Kinya", "Marete", "Kanampiu", "Mukami", "Gitobu", "Mwirigi", "Kagwiria",
    "Rimberia", "Nabea", "Gakunyi", "Mworoa", "Kathure", "Muthaa", "Mbaka", "Rweria",
    # Maasai / Pastoralist
    "Nashipae", "Lenguro", "Senteu", "Naisula", "Leshan", "Nokun", "Naipanoi", "Naserian",
    # Common / Pan-Kenyan Christian & English names
    "Brian", "Mercy", "John", "Mary", "James", "Grace", "Peter", "Faith",
    "David", "Hope", "Joseph", "Joy", "Samuel", "Peace", "Daniel", "Charity",
    "Michael", "Esther", "Stephen", "Ruth", "Paul", "Naomi", "Andrew", "Deborah",
    "Joshua", "Rebecca", "Matthew", "Hannah", "Thomas", "Leah", "Christopher", "Sarah",
    "Nicholas", "Martha", "Anthony", "Elizabeth", "Mark", "Dorothy", "Kevin", "Miriam",
    "Timothy", "Priscilla", "Patrick", "Lydia", "Benjamin", "Lois", "Jonathan", "Eunice",
    "Alexander", "Anna", "Vincent", "Judith", "George", "Rachel", "Edward", "Jane",
    "Ronald", "Evelyn", "Collins", "Alice", "Dennis", "Agnes", "Martin", "Florence",
    "Simon", "Rose", "Erick", "Catherine", "Victor", "Monica", "Allan", "Susan",
    "Gilbert", "Janet", "Robert", "Teresa", "Harun", "Margaret", "Isaac", "Caroline",
    "Moses", "Veronica", "Aaron", "Diana", "Elijah", "Ann", "Isaiah", "Lilian",
    "Jeremiah", "Beatrice", "Ezekiel", "Gladys", "Joel", "Jacqueline", "Amos", "Edith",
    "Jonah", "Pauline", "Micah", "Judy", "Nahum", "Sophia", "Habakkuk", "Cynthia",
    "Zephaniah", "Irene", "Haggai", "Flora", "Zechariah", "Emily", "Malachi", "Brenda",
    "Philemon", "Sharon", "Barnabas", "Bridget", "Silas", "Agnes", "Cecilia", "Faith",
]

LAST_NAMES = [
    # Kikuyu / Central
    "Kamau", "Mwangi", "Kariuki", "Kimani", "Maina", "Njoroge", "Gichuru", "Wangari",
    "Wambui", "Wairimu", "Njuguna", "Karanja", "Wachira", "Kinyua", "Mugo", "Githinji",
    "Mburu", "Ndegwa", "Wanjohi", "Gacheru", "Mungai", "Kagwe", "Nganga", "Wanyoike",
    "Githua", "Kiarie", "Mwaura", "Gichuki", "Kibathi", "Mbuthia", "Gikonyo", "Kamande",
    "Macharia", "Wamuyu", "Gitau", "Kamotho", "Kihika", "Wambugu", "Waithera", "Kihumba",
    # Luo
    "Otieno", "Ochieng", "Omondi", "Odhiambo", "Onyango", "Okoth", "Opiyo", "Owuor",
    "Awuor", "Achieng", "Atieno", "Akinyi", "Anyango", "Auma", "Awino", "Ojwang",
    "Okello", "Awiti", "Oduya", "Adoyo",
    # Luhya
    "Wekesa", "Wanyonyi", "Wafula", "Simiyu", "Nanjala", "Nafula", "Naliaka", "Nekesa",
    "Wamalwa", "Mukhwana", "Masinde", "Khaemba", "Nabwire", "Namukhula", "Nasimiyu", "Wabomba",
    # Kalenjin
    "Kiprotich", "Kipchumba", "Kipkemoi", "Kiprop", "Kipkemboi", "Kipkirui", "Kipkoech",
    "Kipkorir", "Kipchirchir", "Kipsang", "Kiprono", "Kipngetich", "Koech", "Rono",
    "Cherono", "Chebet", "Jebet", "Jepkoech", "Jepkorir", "Chepkorir", "Chepngeno", "Chepkirui",
    "Cheruiyot", "Mutai", "Kemei", "Rotich",
    # Kamba
    "Mutua", "Musyoka", "Mwikali", "Mumo", "Kioko", "Muthoka", "Mutisya", "Nduku",
    "Mwania", "Kasina", "Kilonzo", "Munyao", "Muema", "Mutinda", "Ndunge", "Mulwa",
    # Kisii
    "Ondieki", "Momanyi", "Ongeri", "Ombati", "Kebaso", "Mokua", "Onsongo", "Nyambane",
    "Mogaka", "Oseko", "Ogero", "Matoke", "Mwango", "Ongaya",
    # Meru / Embu
    "Gitonga", "Muriuki", "Mutwiri", "Muthuri", "Kinya", "Marete", "Gitobu", "Mwirigi",
    "Rimberia", "Nabea", "Mworoa", "Mbaka", "Kaimenyi", "Kanampiu",
    # Maasai
    "Lenguro", "Senteu", "Leshan", "Kipaati", "Saidimu", "Munyori",
    # Kalenjin subgroup / Rift Valley
    "Sigei", "Koech", "Keter", "Chepkwony", "Bett", "Langat", "Ngeno", "Mitei",
    "Korir", "Kosgei", "Kimutai", "Kenei", "Towett", "Kangogo", "Koross", "Mitei",
    # Coastal / Swahili
    "Mwakisha", "Mwamburi", "Mwangolo", "Mcharo", "Mwakideu", "Baya", "Kenga", "Tsuma",
    "Mwinyi", "Juma", "Mohamed", "Ali", "Hassan", "Omar", "Salim", "Athman",
    # Western / Pan-Kenyan
    "Wanjala", "Barasa", "Musalia", "Situma", "Wandera", "Wadada", "Lubanga", "Otula",
    "Osebe", "Olela", "Musila", "Mulandi", "Nzioka", "Katua", "Mutune", "Maingi",
    "Muthama", "Kivuva", "Ndunda", "Mwendwa", "Musyimi",
]

# 40 dedicated Tech Fellowship mentors (separate pool, never used as beneficiaries)
MENTOR_NAMES = [
    "Prof. James Mwangi", "Dr. Grace Wanjiku", "Eng. Peter Ochieng", "Dr. Mary Akinyi",
    "Prof. David Kiprotich", "Dr. Sarah Mutua", "Eng. John Wekesa", "Prof. Esther Ondieki",
    "Dr. Michael Gitonga", "Eng. Faith Nashipae", "Prof. Robert Kamau", "Dr. Lucy Otieno",
    "Eng. Anthony Wanyonyi", "Prof. Catherine Chepkorir", "Dr. Daniel Musyoka", "Eng. Anne Momanyi",
    "Prof. Kevin Muriuki", "Dr. Joy Kaloki", "Eng. Brian Mulwa", "Prof. Mercy Nduku",
    "Dr. Collins Mwania", "Eng. Martin Kasina", "Prof. Victor Kioko", "Dr. Allan Mumo",
    "Eng. Gilbert Mutisya", "Prof. Robert Kiema", "Dr. Harun Mwikali", "Eng. Isaac Mutua",
    "Prof. Moses Muthoka", "Dr. Aaron Nduku", "Eng. Elijah Mwania", "Prof. Isaiah Kasina",
    "Dr. Jeremiah Kioko", "Eng. Ezekiel Mumo", "Prof. Daniel Mutisya", "Dr. Joel Muthoka",
    "Eng. Amos Nduku", "Prof. Obadiah Mwania", "Dr. Jonah Kasina", "Eng. Micah Kioko",
]

# Kenyan county -> sub-county -> ward hierarchy (geographically valid combinations)
KENYAN_GEOGRAPHY = {
    "Nairobi": {
        "Westlands": ["Kitisuru", "Parklands", "Kangemi", "Mountain View"],
        "Dagoretti North": ["Kilimani", "Kawangware", "Gatina", "Kileleshwa"],
        "Dagoretti South": ["Mutuini", "Ngando", "Riruta", "Uthiru", "Waithaka"],
        "Lang'ata": ["Karen", "Nairobi West", "Mugumu-ini", "South C", "Nyayo Highrise"],
        "Kibra": ["Laini Saba", "Lindi", "Makina", "Woodley", "Sarang'ombe"],
        "Kasarani": ["Clay City", "Mwiki", "Kasarani", "Njiru", "Ruai", "Kamulu"],
    },
    "Kiambu": {
        "Kiambu": ["Ting'ang'a", "Ndumberi", "Riabai", "Kihara"],
        "Ruiru": ["Gatong'ora", "Kahawa Sukari", "Kahawa Wendani", "Kiuu"],
        "Githunguri": ["Githunguri", "Githiga", "Ikinu", "Ngewa"],
        "Limuru": ["Bibirioni", "Limuru Central", "Ndeiya", "Limuru East"],
        "Lari": ["Kinale", "Kijabe", "Nyanduma", "Kamburu"],
        "Kabete": ["Gitaru", "Muguga", "Nyathuna", "Kabete"],
        "Kikuyu": ["Kinoo", "Kikuyu", "Nachu", "Sigona"],
    },
    "Mombasa": {
        "Changamwe": ["Changamwe", "Chaani", "Miritini", "Airport"],
        "Jomvu": ["Jomvu Kuu", "Miritini", "Mikindani"],
        "Kisauni": ["Mjambere", "Bamburi", "Mwakirunge", "Mtopanga"],
        "Nyali": ["Frere Town", "Ziwa la Ng'ombe", "Mkomani", "Kongowea"],
        "Likoni": ["Mtongwe", "Shika Adabu", "Bofu", "Likoni", "Tsimba"],
        "Mvita": ["Mji wa Kale", "Tudor", "Tononoka", "Shimanzi", "Majengo"],
    },
    "Kisumu": {
        "Kisumu East": ["Kajulu", "Kolwa East", "Manyatta 'B'", "Nyalenda 'A'"],
        "Kisumu West": ["South West Kisumu", "Central Kisumu", "North Kisumu", "West Kisumu"],
        "Kisumu Central": ["Market Milimani", "Kaloleni", "Shauri Moyo", "Nyalenda 'B'"],
        "Seme": ["West Seme", "Central Seme", "East Seme", "North Seme"],
        "Nyando": ["East Kano/Wawidhi", "Awasi/Onjiko", "Kabonyo/Kanyagwal", "Kobura"],
        "Muhoroni": ["Muhoroni/Koru", "Ombeyi", "Masogo/Nyang'oma", "Chemelil"],
        "Nyakach": ["South West Nyakach", "North Nyakach", "Central Nyakach", "West Nyakach"],
    },
    "Nakuru": {
        "Nakuru Town East": ["Biashara", "Kivumbini", "Flamingo", "Menengai"],
        "Nakuru Town West": ["Barut", "London", "Kapkures", "Kaptembwo", "Rhoda"],
        "Bahati": ["Dundori", "Kabatini", "Kiamaina", "Lanet/Umoja", "Bahati"],
        "Rongai": ["Menengai West", "Soin", "Visoi", "Mosop", "Solai"],
        "Kuresoi South": ["Amalo", "Keringet", "Kiptagich", "Tinet"],
        "Kuresoi North": ["Kiptororo", "Nyota", "Sirikwa", "Kamara"],
        "Molo": ["Marioshoni", "Elburgon", "Turi", "Molo"],
        "Gilgil": ["Gilgil", "Mbaruk/Eburu", "Malewa West", "Murindat"],
        "Naivasha": ["Biashara-Naivasha", "Hells Gate", "Lake View", "Maai Mahiu", "Maiella"],
        "Subukia": ["Subukia", "Waseges", "Kabazi"],
    },
    "Uasin Gishu": {
        "Soy": ["Moi's Bridge", "Kapkures", "Ziwa", "Segero/Barsombe", "Kipsomba"],
        "Turbo": ["Ngenyilel", "Tapsagoi", "Kamagut", "Kiplombe", "Huruma"],
        "Moiben": ["Tembelio", "Sergoit", "Kimumu", "Moiben"],
        "Ainabkoi": ["Kapsoya", "Kaptagat", "Ainabkoi/Olare", "Racecourse"],
        "Kapseret": ["Simat/Kapseret", "Megun", "Ngeria", "Langas"],
        "Kesses": ["Racecourse", "Cheptiret/Kipchamo", "Tulwet/Chuiyat", "Taratai"],
    },
    "Kakamega": {
        "Lugari": ["Mautuma", "Lugari", "Lwandeti", "Chekalini", "Manda/Shivanga"],
        "Mumias East": ["Lusheya/Lubinu", "Malaha/Isongo/Masindi", "East Wanga"],
        "Mumias West": ["Etenje", "Musanda", "West Wanga", "Mutema"],
        "Matungu": ["Koyonzo", "Kholera", "Khalaba", "Mayoni", "Namamali"],
        "Butere": ["Marama West", "Marama Central", "Marama North", "Marama South"],
        "Khwisero": ["Kisa North", "Kisa East", "Kisa West", "Kisa Central"],
        "Shinyalu": ["Isukha North", "Isukha South", "Isukha Central", "Isukha West"],
        "Ikolomani": ["Idakho South", "Idakho North", "Idakho East", "Idakho Central"],
    },
    "Machakos": {
        "Machakos Town": ["Kalama", "Kola", "Mua", "Mutituni", "Machakos Central"],
        "Mavoko": ["Athi River", "Kinanie", "Muthwani", "Syokimau/Mulolongo"],
        "Kathiani": ["Mitaboni", "Kathiani Central", "Upper Kaewa/Iveti", "Lower Kaewa/Iveti"],
        "Masinga": ["Kivaa", "Masinga Central", "Ekalakala", "Muthesya", "Ndithini"],
        "Yatta": ["Ndalani", "Matuu", "Kithimani", "Ikombe", "Katangi"],
        "Kangundo": ["Kangundo North", "Kangundo Central", "Kangundo East", "Kangundo West"],
        "Matungulu": ["Tala", "Matungulu North", "Matungulu East", "Matungulu West", "Kyeleni"],
    },
    "Meru": {
        "Igembe South": ["Mau/Antuamburi", "Nkondi", "Athiru Gaiti", "Athiru Ruujine"],
        "Igembe Central": ["Akachiu", "Athiru Gaiti", "Kiegoi", "Antubochiu"],
        "Igembe North": ["Antuamburi", "Ntunene", "Antubetwe Kiongo", "Naathu"],
        "Tigania West": ["Athwana", "Akithi", "Kianjai", "Nkomo"],
        "Tigania East": ["Mikinduri", "Kiguchwa", "Muthara", "Karama", "Thangatha"],
        "North Imenti": ["Mweronkanga", "Kithirune", "Nkubu", "Nyaki West"],
        "Buuri": ["Timau", "Kisima", "Kiirua/Naari", "Ruiri/Rwarera", "Kibirichia"],
        "Central Imenti": ["Kathonzweni", "Kabachi", "Mwangathia", "Gatimbi"],
        "South Imenti": ["Igoji East", "Igoji West", "Abogeta East", "Abogeta West", "Nkuene"],
    },
    "Turkana": {
        "Turkana North": ["Kaeris", "Lake Zone", "Lapurr", "Kaikor", "Kibish"],
        "Turkana West": ["Kakuma", "Lopur", "Letea", "Songot", "Kalobeyei"],
        "Turkana Central": ["Kerio Delta", "Kang'atotha", "Kalokol", "Lodwar Township", "Kanamkemer"],
        "Loima": ["Kotaruk/Lobei", "Turkwel", "Loima", "Lokiriama/Lorengippi"],
        "Turkana South": ["Kapedo/Napeitom", "Katilu", "Lobokat", "Kalamon", "Kaputir"],
        "Turkana East": ["Kapedo/Napeitom", "Katilia", "Lokori/Kochodin", "Lokichar"],
    },
    "Bungoma": {
        "Mt. Elgon": ["Cheptais", "Chepyuk", "Kapkateny", "Kaptama", "Elgon"],
        "Sirisia": ["Namwela", "Malakisi/South Kulisiru", "Lwandanyi"],
        "Kabuchai": ["Kabuchai/Chwele", "West Nalondo", "Bwake/Luuya", "Mukuyuni"],
        "Bumula": ["South Bukusu", "Bumula", "Khasoko", "Kabula", "Kimaeti"],
        "Kanduyi": ["Buokhwe", "Khalaba", "Marakaru/Tuuti", "West Sang'alo", "East Sang'alo"],
        "Webuye East": ["Mihuu", "Ndivisi", "Maraka"],
        "Webuye West": ["Sitikho", "Matulo", "Bokoli", "Kimilili"],
        "Kimilili": ["Kibingei", "Kimilili", "Maeni", "Kamukuywa"],
    },
    "Nyeri": {
        "Tetu": ["Wamagana", "Aguthi/Gaaki", "Dedan Kimathi"],
        "Kieni": ["Mweiga", "Naromoru/Kiamathaga", "Mwiyogo/Endarasha", "Gatarakwa", "Thegu"],
        "Mathira": ["Ruguru", "Magutu", "Iriaini", "Konyu", "Kirimukuyu"],
        "Othaya": ["Mahiga", "Iria-ini", "Chinga", "Karima", "Ngaru"],
        "Mukurweini": ["Gikondi", "Rugi", "Mukurwe-ini West", "Mukurwe-ini Central", "Githi"],
        "Nyeri Town": ["Ruring'u", "Kamakwa/Mukaro", "Kiganjo/Mathari", "Rware"],
    },
    "Kilifi": {
        "Kilifi North": ["Tezo", "Sokoni", "Kibarani", "Dabaso", "Matsangoni", "Watamu", "Mnarani"],
        "Kilifi South": ["Junju", "Mwarakaya", "Shimo la Tewa", "Chasimba", "Mtepeni"],
        "Kaloleni": ["Mwanamwinga", "Kayafungo", "Kaloleni", "Mariakani"],
        "Rabai": ["Mwawesa", "Ruruma", "Kambe/Ribe", "Rabai/Kisurutini"],
        "Ganze": ["Ganze", "Bamba", "Jaribuni", "Sokoke"],
        "Malindi": ["Jilore", "Kakuyuni", "Ganda", "Malindi Town", "Shella"],
        "Magarini": ["Marafa", "Magarini", "Gongoni", "Adu", "Garashi", "Sabaki"],
    },
    "Trans Nzoia": {
        "Kwanza": ["Kapomboi", "Kwanza", "Keiyo", "Bidii"],
        "Endebess": ["Chepchoina", "Endebess", "Matumbei"],
        "Saboti": ["Kinyoro", "Matisi", "Tuwani", "Saboti", "Machewa"],
        "Kiminini": ["Hospital", "Kiminini", "Waitaluk", "Sirende", "Nabiswa"],
        "Cherangany": ["Sitatunga", "Makutano", "Kaplamai", "Motosi", "Cherangany/Suwerwa"],
    },
    "Bomet": {
        "Sotik": ["Ndanai/Abosi", "Kipsonoi", "Kapletundo", "Rongena/Manaret", "Chemagel"],
        "Chepalungu": ["Kongasis", "Nyongores", "Sigour", "Chebunyo", "Siongiroi"],
        "Bomet East": ["Merigi", "Kembu", "Longisa", "Kipreres", "Chemaner"],
        "Bomet Central": ["Silibwet Township", "Ndarawetta", "Singorwet", "Chesoen", "Mutarakwa"],
        "Konoin": ["Chepchabs", "Kimulot", "Mogogosiek", "Boito", "Embomos"],
    },
}

# County population weights (rough relative weights so big counties dominate)
COUNTY_WEIGHTS = [
    ("Nairobi", 0.16), ("Kiambu", 0.12), ("Nakuru", 0.09), ("Kakamega", 0.08),
    ("Mombasa", 0.07), ("Kisumu", 0.06), ("Uasin Gishu", 0.06), ("Machakos", 0.06),
    ("Meru", 0.05), ("Bungoma", 0.05), ("Kilifi", 0.05), ("Nyeri", 0.04),
    ("Trans Nzoia", 0.04), ("Bomet", 0.04), ("Turkana", 0.03),
]

STREET_NAMES = [
    "Mugumo", "Kitisuru", "Lavington", "Kilimani", "Westlands", "Parklands",
    "Kileleshwa", "Ruiru", "Thika", "Kiambu", "Limuru", "Kikuyu", "Ngong",
    "Karen", "Langata", "Moi Avenue", "Kenyatta", "Jogoo", "Mombasa Road",
    "Waiyaki", "Kiambu Road", "Ngong Road", "Argwings Kodhek", "Lenana",
    "Tom Mboya", "River Road", "Likoni", "Uhuru", "Juja", "Athi River",
    "Kangundo", "Ruaraka", "Outering", "Thika Superhighway", "Kasarani", "Garden Estate",
]

EDUCATION_LEVELS = ["Secondary", "Diploma", "Undergraduate", "Postgraduate", "Certificate"]
COURSES = [
    "Medicine", "Engineering", "Education", "Business", "Law", "Information Technology",
    "Agriculture", "Nursing", "Economics", "Computer Science", "Accounting",
    "Civil Engineering", "Architecture", "Journalism", "Public Health", "Social Work",
]
SCHOOLS = [
    "Alliance High School", "Mang'u High School", "Maseno School", "Lenana School",
    "Kabianga High School", "Moi High School Kabarak", "Maranda High School",
    "Starehe Boys Centre", "Kenya High School", "Prestige Academy", "Green Garden Academy",
    "St. Joseph's School", "Rift Valley Institute", "Coast Institute of Technology",
    "Eldoret National Polytechnic", "Kenya Methodist University", "Kenyatta University",
    "University of Nairobi", "JKUAT", "Moi University", "Strathmore University",
    "Mount Kenya University", "Maseno University", "Egerton University",
]
TRAINING_CENTERS = [
    "Nairobi Vocational Training Centre", "Kisumu Youth Skills Centre", "Mombasa Technical Institute",
    "Eldoret Polytechnic", "Nakuru Industrial Training Centre", "Kakamega Youth Polytechnic",
    "Machakos Technical Institute", "Meru Vocational Centre", "Kitale Technical College",
    "Thika Technical Training Institute", "Bomet Youth Polytechnic", "Kilifi Institute",
]
TRAINING_AREAS = [
    "Automotive", "Electrical", "Plumbing", "Welding", "Carpentry", "Hairdressing",
    "ICT", "Masonry", "Tailoring", "Catering", "Metalwork", "Graphics Design",
]
SKILL_CATEGORIES = ["Technical", "Artisan", "Digital", "Hospitality"]
VOC_TRAINING_STATUS = ["Enrolled", "In Progress", "Completed", "Dropped Out"]
VOC_COMPLETION_STATUS = ["Not Started", "Ongoing", "Completed", "Certified"]
EMPLOYMENT_STATUSES = ["Employed", "Self-Employed", "Unemployed", "Student", "Retired"]
SUPPORT_TYPES = [
    "Cash Transfer", "Food Support", "Medical Cover", "Education Support", "Business Grant",
]
PLUS_CATEGORIES = ["Vulnerable", "Elderly", "PWD", "Orphan", "Widow", "Youth"]
TECH_TRACKS = [
    "Software Engineering", "Data Science", "Cybersecurity", "Cloud Computing",
    "AI/ML", "DevOps", "Mobile Development", "Data Engineering",
]
PROJECT_AREAS = [
    "Fintech", "HealthTech", "AgriTech", "EdTech", "E-Commerce", "IoT",
    "Logistics", "Clean Energy",
]
TECH_COMPLETION = ["Active", "Completed", "Withdrawn", "On Hold"]

ALL_GENDER_REPS = ["M", "F", "Male", "Female", "MALE", "FEMALE", "male", "female"]
ALL_STATUS_REPS = ["Active", "ACTIVE", "active", "A", "Inactive", "INACTIVE",
                   "inactive", "I", "Pending", "pending"]


# ====================================================================================
# HELPER FUNCTIONS
# ====================================================================================

def weighted_choice(pairs: List[Tuple[object, float]], rng: random.Random) -> object:
    """Pick a value from (value, weight) pairs using a given RNG."""
    total = sum(w for _, w in pairs)
    r = rng.uniform(0, total)
    upto = 0.0
    for value, w in pairs:
        upto += w
        if r <= upto:
            return value
    return pairs[-1][0]


def pick_weighted(d: Dict[object, float], rng: random.Random) -> object:
    """Pick a key from a {key: weight} dict."""
    return weighted_choice(list(d.items()), rng)


def introduce_typo(word: str, rng: random.Random) -> str:
    """Introduce a realistic human typing error in a word."""
    if len(word) <= 2 or rng.random() < 0.15:
        return word
    op = rng.choice(["transpose", "delete", "substitute", "double", "insert"])
    if op == "transpose" and len(word) >= 4:
        i = rng.randint(1, len(word) - 2)
        return word[:i] + word[i + 1] + word[i] + word[i + 2:]
    if op == "delete":
        i = rng.randint(1, len(word) - 1)
        return word[:i] + word[i + 1:]
    if op == "substitute":
        i = rng.randint(1, len(word) - 1)
        subs = {
            "a": "e", "e": "a", "i": "e", "o": "u", "u": "o", "c": "k",
            "k": "c", "s": "z", "z": "s", "b": "p", "p": "b", "d": "t",
            "t": "d", "m": "n", "n": "m", "w": "v", "v": "w", "g": "j",
            "j": "g", "y": "i", "i": "y", "h": "k",
        }
        ch = word[i]
        if ch in subs:
            return word[:i] + subs[ch] + word[i + 1:]
        return word
    if op == "double":
        i = rng.randint(1, len(word) - 1)
        return word[:i] + word[i] + word[i:]
    if op == "insert":
        i = rng.randint(1, len(word) - 1)
        extra = rng.choice(["a", "e", "i", "o", "n", "r", "s", "t"])
        return word[:i] + extra + word[i:]
    return word


def introduce_id_typo(nid: str, rng: random.Random) -> str:
    """Small, realistic national-ID transcription mistake."""
    if rng.random() < 0.5:
        i = rng.randint(0, len(nid) - 2)
        return nid[:i] + nid[i + 1] + nid[i] + nid[i + 2:]
    i = rng.randint(0, len(nid) - 1)
    old = int(nid[i])
    delta = rng.choice([-1, 1])
    new_d = (old + delta) % 10
    return nid[:i] + str(new_d) + nid[i + 1:]


def vary_email_username(username: str, rng: random.Random) -> str:
    """Produce a realistic alternative email username for the same person."""
    parts = username.replace(".", " ").replace("_", " ").replace("-", " ").split()
    variants = []
    if len(parts) >= 2:
        first, last = parts[0], parts[-1]
        variants.append(first + "." + last)
        variants.append(first[0] + "." + last)
        variants.append(first + last)
        variants.append(first + "_" + last)
        variants.append(first)
        variants.append(last + first)
        variants.append(first[0] + last)
        variants.append(first + str(rng.randint(1, 99)))
        variants.append(first[0] + "." + last[0])
    elif len(parts) == 1:
        variants.append(parts[0])
        variants.append(parts[0] + str(rng.randint(1, 99)))
        variants.append(parts[0][:4])
    return rng.choice(variants)


def format_phone(phone: str, style: str) -> str:
    """Format a canonical '07XXXXXXXX' phone number into a public representation."""
    if not phone:
        return phone
    digits = phone
    local = digits[:3] + " " + digits[3:6] + " " + digits[6:]
    local_dash = digits[:4] + "-" + digits[4:7] + "-" + digits[7:]
    if style == "local":
        return digits
    if style == "international":
        return "+254" + digits[1:]
    if style == "no_prefix":
        return "254" + digits[1:]
    if style == "spaced":
        return "254 " + digits[1:4] + " " + digits[4:7] + " " + digits[7:]
    if style == "dashed":
        return "+254 " + digits[1:4] + "-" + digits[4:7] + "-" + digits[7:]
    if style == "dotted":
        return digits[:4] + "." + digits[4:7] + "." + digits[7:]
    if style == "international_spaced":
        return "+254 " + digits[1:4] + " " + digits[4:7] + " " + digits[7:]
    if style == "local_spaced":
        return local
    if style == "local_dashed":
        return local_dash
    return digits


def format_id(nid: str, style: str) -> str:
    """Format a canonical 8-digit national ID into a public representation."""
    if not nid:
        return nid
    if style == "plain":
        return nid
    if style == "spaced":
        return nid[:2] + " " + nid[2:5] + " " + nid[5:]
    if style == "dashed":
        return nid[:2] + "-" + nid[2:5] + "-" + nid[5:]
    if style == "leading_space":
        return " " + nid
    if style == "trailing_space":
        return nid + " "
    if style == "hyphen_middle":
        return nid[:4] + "-" + nid[4:]
    return nid


def format_date(d: date, style: str) -> str:
    """Format a canonical date into a public representation."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    if style == "iso":
        return d.strftime("%Y-%m-%d")
    if style == "dmy_slash":
        return d.strftime("%d/%m/%Y")
    if style == "dmy_dash":
        return d.strftime("%d-%m-%Y")
    if style == "mdy_slash":
        return d.strftime("%m/%d/%Y")
    if style == "d_mon_year":
        return d.strftime("%d-") + months[d.month - 1] + "-" + str(d.year)
    if style == "d-mon-yy":
        return d.strftime("%d-") + months[d.month - 1] + "-" + str(d.year)[2:]
    if style == "long_d_mon_yy":
        return d.strftime("%d ") + months[d.month - 1] + " " + str(d.year)
    if style == "mdy_dash":
        return d.strftime("%m-%d-%Y")
    if style == "yyyymmdd":
        return d.strftime("%Y%m%d")
    return d.strftime("%Y-%m-%d")


def vary_name(canonical_name: str, style: str, rng: random.Random) -> str:
    """Produce a realistic public name representation for a canonical full name."""
    parts = canonical_name.split()
    first, last = parts[0], parts[-1]
    middle = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    if style == "upper":
        return canonical_name.upper()
    if style == "lower":
        return canonical_name.lower()
    if style == "title":
        return canonical_name.title()
    if style == "reversed":
        if middle:
            return last + " " + first + " " + middle
        return last + " " + first
    if style == "comma":
        if middle:
            return last + ", " + first + " " + middle
        return last + ", " + first
    if style == "initials":
        if middle:
            return first[0] + ". " + middle[0] + ". " + last
        return first[0] + ". " + last
    if style == "extra_spaces":
        return "  ".join(parts)
    if style == "double_cap":
        t = last
        if len(t) >= 3:
            i = rng.randint(1, len(t) - 1)
            return first + " " + t[:i] + t[i] + t[i:]
        return canonical_name
    if style == "missing_space":
        if middle:
            return first + " " + last + middle
        return first + last
    if style == "middle_initial":
        if middle:
            return first + " " + middle[0] + ". " + last
        return first + " " + last
    if style == "typo":
        return first + " " + introduce_typo(last, rng)
    return canonical_name


def apply_programme_name_case(name: str, prog_key: str, rng: random.Random) -> str:
    """Apply a programme's default name-case convention (some systems force a case)."""
    case = PROGRAMMES[prog_key]["name_case"]
    if case == "upper":
        return name.upper()
    if case == "lower":
        return name.lower()
    if case == "mixed":
        return name.upper() if rng.random() < 0.5 else name.lower()
    return name


def apply_programme_email_case(email: str, prog_key: str, rng: random.Random) -> str:
    """Apply a programme's default email-case convention."""
    case = PROGRAMMES[prog_key]["email_case"]
    if not email or "@" not in email:
        return email
    if case == "upper":
        return email.upper()
    if case == "mixed":
        local, dom = email.split("@")
        return (local.capitalize() + "@" + dom) if rng.random() < 0.5 else email
    return email


def generate_address(rng: random.Random) -> str:
    """Generate a synthetic but plausible Kenyan address."""
    street = rng.choice(STREET_NAMES)
    area = rng.choice(STREET_NAMES)
    num = rng.randint(1, 480)
    if rng.random() < 0.6:
        lane = rng.randint(1, 20)
        return f"Plot {num}, Lane {lane}, {area}"
    road = rng.choice(["Road", "Street", "Avenue", "Drive"])
    return f"House {num}, {street} {road}, {area}"


def vary_address(address: str, rng: random.Random) -> str:
    """Apply a realistic formatting variation to an address."""
    style = rng.choice(["upper", "lower", "no_comma", "compact", "abbrev", "title"])
    if style == "upper":
        return address.upper()
    if style == "lower":
        return address.lower()
    if style == "no_comma":
        return address.replace(",", "").replace("  ", " ")
    if style == "compact":
        return address.replace(",", "").replace(" ", "").replace("Road", "Rd")
    if style == "abbrev":
        return (address.replace("Road", "Rd").replace("Street", "St")
                       .replace("Lane", "Ln").replace("Avenue", "Ave"))
    if style == "title":
        return address.title()
    return address


def vary_academic_year(year: str, rng: random.Random) -> str:
    """Create a realistic dirty variant of a canonical 'YYYY/YYYY' academic year."""
    y1, y2 = year.split("/")[0], year.split("/")[1]
    style = rng.choice(["dash", "endash", "spaced", "spaced_left", "spaced_right"])
    if style == "dash":
        return f"{y1}-{y2}"
    if style == "endash":
        return f"{y1}\u2013{y2}"
    if style == "spaced":
        return f"{y1} / {y2}"
    if style == "spaced_left":
        return f"{y1} /{y2}"
    if style == "spaced_right":
        return f"{y1}- {y2}"
    return f"{y1}/{y2}"


def vary_cohort(cohort: str, rng: random.Random) -> str:
    """Create a realistic dirty variant of canonical 'Cohort 1'."""
    num = cohort.split()[-1]
    style = rng.choice(["upper", "lower", "dash", "zero_pad", "short", "double_space",
                        "tight", "upper_dash", "short_hyphen"])
    if style == "upper":
        return f"COHORT {num}"
    if style == "lower":
        return f"cohort {num}"
    if style == "dash":
        return f"Cohort-{num}"
    if style == "zero_pad":
        return f"Cohort {int(num):02d}"
    if style == "short":
        return f"C{num}"
    if style == "double_space":
        return f"Cohort  {num}"
    if style == "tight":
        return f"Cohort{num}"
    if style == "upper_dash":
        return f"COHORT-{int(num):02d}"
    if style == "short_hyphen":
        return f"C-{num}"
    return f"Cohort {num}"


def beta_young(rng: random.Random) -> float:
    """Small Beta-like sample skewed toward younger ages (no scipy)."""
    u1 = rng.random()
    u2 = rng.random()
    return (u1 * (1 - u2)) ** 0.6


def digits_only(s) -> str:
    if s is None:
        return ""
    return "".join(ch for ch in str(s) if ch.isdigit())


def normalize_name(name: str) -> str:
    return " ".join(str(name).upper().replace(",", "").split())


def is_missing_value(val) -> bool:
    if val is None:
        return True
    try:
        if pd.isna(val):
            return True
    except (TypeError, ValueError):
        pass
    return str(val).strip() in {"", "NULL", "N/A", "NA", "Not Provided", "Unknown", "nan", "None"}


# ====================================================================================
# DATA CLASSES
# ====================================================================================

@dataclass
class CanonicalPerson:
    canonical_person_id: int
    canonical_full_name: str
    canonical_national_id: str
    canonical_phone: str
    canonical_email: str
    canonical_dob: date
    canonical_gender: str
    canonical_county: str
    canonical_sub_county: str
    canonical_ward: str
    canonical_address: str
    sch_school: str = ""
    sch_level: str = ""
    sch_course: str = ""
    sch_amount: int = 0
    sch_year: str = ""
    voc_center: str = ""
    voc_area: str = ""
    voc_skill: str = ""
    voc_status: str = ""
    voc_completion: str = ""
    plus_household_size: int = 0
    plus_employment: str = ""
    plus_income: int = 0
    plus_support: str = ""
    plus_category: str = ""
    tech_track: str = ""
    tech_cohort: str = ""
    tech_mentor: str = ""
    tech_project: str = ""
    tech_completion: str = ""


@dataclass
class PublicRecord:
    programme: str
    beneficiary_id: str
    person: CanonicalPerson
    values: dict = field(default_factory=dict)
    flags: dict = field(default_factory=dict)
    is_duplicate: bool = False
    duplicate_type: str = ""
    dup_group_id: Optional[str] = None


@dataclass
class ValidationResult:
    passed: bool
    errors: List[str]
    stats: pd.DataFrame
    summary: pd.DataFrame


# ====================================================================================
# CANONICAL MASTER POPULATION GENERATION
# ====================================================================================

def generate_canonical_people(n_people: int, rng: random.Random) -> List[CanonicalPerson]:
    """Create the canonical master population."""
    people: List[CanonicalPerson] = []
    used_phones = set()
    used_emails = set()

    counties = [c for c, _ in COUNTY_WEIGHTS]
    county_w = [w for _, w in COUNTY_WEIGHTS]

    # Guarantee unique, plausible 8-digit national IDs (small pool, no giant list)
    used_ids = set()
    for i in range(n_people):
        nid = str(rng.randint(10000000, 99999999))
        while nid in used_ids:
            nid = str(rng.randint(10000000, 99999999))
        used_ids.add(nid)

    for i in range(n_people):
        gender = rng.choice(["Male", "Female"])
        first_name = rng.choice(FIRST_NAMES)
        last_name = rng.choice(LAST_NAMES)
        if rng.random() < 0.5:
            middle = rng.choice(FIRST_NAMES)
            full_name = f"{first_name} {middle} {last_name}"
        else:
            full_name = f"{first_name} {last_name}"

        nid = str(rng.randint(10000000, 99999999))
        while nid in used_ids:
            nid = str(rng.randint(10000000, 99999999))
        used_ids.add(nid)

        prefix = rng.choice(["070", "071", "072", "073", "074", "075", "076",
                             "077", "078", "079", "010", "011", "011"])
        phone = prefix + f"{rng.randint(100000, 999999):06d}"
        while phone in used_phones:
            phone = prefix + f"{rng.randint(100000, 999999):06d}"
        used_phones.add(phone)

        domain = weighted_choice(CONFIG["email_domains"], rng)
        base_username = f"{first_name.lower()}.{last_name.lower()}"
        email = f"{base_username}@{domain}"
        while email in used_emails:
            email = f"{vary_email_username(base_username, rng)}@{domain}"
        used_emails.add(email)

        age = 18 + int(beta_young(rng) * 60)
        year = 2024 - age
        dob = date(year, rng.randint(1, 12), rng.randint(1, 28))

        county = weighted_choice(list(zip(counties, county_w)), rng)
        sub_county = rng.choice(list(KENYAN_GEOGRAPHY[county].keys()))
        ward = rng.choice(KENYAN_GEOGRAPHY[county][sub_county])
        address = generate_address(rng)

        sy = rng.randint(2022, 2025)
        income = float(np.random.lognormal(mean=10.4, sigma=0.8))
        income = int(min(200000, max(5000, income)))

        people.append(CanonicalPerson(
            canonical_person_id=i + 1,
            canonical_full_name=full_name,
            canonical_national_id=nid,
            canonical_phone=phone,
            canonical_email=email,
            canonical_dob=dob,
            canonical_gender=gender,
            canonical_county=county,
            canonical_sub_county=sub_county,
            canonical_ward=ward,
            canonical_address=address,
            sch_school=rng.choice(SCHOOLS),
            sch_level=rng.choice(EDUCATION_LEVELS),
            sch_course=rng.choice(COURSES),
            sch_amount=int(np.random.triangular(50000, 150000, 500000)),
            sch_year=f"{sy}/{sy + 1}",
            voc_center=rng.choice(TRAINING_CENTERS),
            voc_area=rng.choice(TRAINING_AREAS),
            voc_skill=rng.choice(SKILL_CATEGORIES),
            voc_status=rng.choice(VOC_TRAINING_STATUS),
            voc_completion=rng.choice(VOC_COMPLETION_STATUS),
            plus_household_size=int(np.random.choice(
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                p=[0.08, 0.14, 0.20, 0.20, 0.14, 0.10, 0.06, 0.04, 0.02, 0.01, 0.005, 0.005])),
            plus_employment=rng.choice(EMPLOYMENT_STATUSES),
            plus_income=int(round(income / 500) * 500),
            plus_support=rng.choice(SUPPORT_TYPES),
            plus_category=rng.choice(PLUS_CATEGORIES),
            tech_track=rng.choice(TECH_TRACKS),
            tech_cohort=f"Cohort {rng.randint(1, 3)}",
            tech_mentor=rng.choice(MENTOR_NAMES),
            tech_project=rng.choice(PROJECT_AREAS),
            tech_completion=rng.choice(TECH_COMPLETION),
        ))

    return people


# ====================================================================================
# PROGRAMME ASSIGNMENT (cross-programme overlap)
# ====================================================================================

def assign_programmes(people: List[CanonicalPerson], base_target: int,
                      rng: random.Random) -> Dict[int, List[str]]:
    """Assign each canonical person to 1-4 programmes, then balance each programme
    to exactly `base_target` members."""
    prog_keys = list(PROGRAMMES.keys())
    weights = CONFIG["assign_weights"]

    assignment: Dict[int, List[str]] = {}
    for person in people:
        n = weighted_choice(list(weights.items()), rng)
        assignment[person.canonical_person_id] = rng.sample(prog_keys, n)

    counts = {k: sum(1 for ps in assignment.values() if k in ps) for k in prog_keys}

    for k in prog_keys:
        # reduce over-full programme
        while counts[k] > base_target:
            cands = [pid for pid, ps in assignment.items() if k in ps]
            if not cands:
                break
            pid = rng.choice(cands)
            assignment[pid].remove(k)
            if not assignment[pid]:
                del assignment[pid]
            counts[k] -= 1
        # top up under-full programme
        while counts[k] < base_target:
            cands = [pid for pid, ps in assignment.items() if k not in ps and len(ps) < 4]
            if not cands:
                break
            pid = rng.choice(cands)
            assignment[pid].append(k)
            counts[k] += 1

    return assignment


# ====================================================================================
# PUBLIC VALUE BUILDERS + DIRTY ROLLS
# ====================================================================================

def build_public_values(prog_key: str, person: CanonicalPerson,
                        rng: random.Random) -> dict:
    """Create the dirty public representation of a canonical person for a programme."""
    prog = PROGRAMMES[prog_key]
    p = CONFIG["dirty_prob"]
    v: dict = {}

    # A single formatting roll drives all formatting-type corruption for this record,
    # so the formatting category stays a single controlled probability.
    fmt_roll = rng.random() < p["formatting"]

    # --- NAME (name_variation + typo rolls are independent categories) ---
    name = person.canonical_full_name
    if rng.random() < p["name_variation"]:
        style = pick_weighted(CONFIG["name_style_weights"], rng)
        if style != "clean":
            name = vary_name(person.canonical_full_name, style, rng)
            v["_name_varied"] = True
    if rng.random() < p["typo"]:
        name = vary_name(person.canonical_full_name, "typo", rng)
        v["_typo"] = True
    v["name"] = apply_programme_name_case(name, prog_key, rng)

    # --- NATIONAL ID (formatting variation + rare controlled transcription) ---
    nid = person.canonical_national_id
    if rng.random() < CONFIG["id_transcription_error_percentage"]:
        v["id"] = introduce_id_typo(nid, rng)
        v["_id_varied"] = True
    elif rng.random() < p["id_variation"]:
        style = pick_weighted(CONFIG["id_style_weights"], rng)
        v["id"] = format_id(nid, style)
        v["_id_varied"] = True
    else:
        v["id"] = nid

    # --- PHONE (variation roll) ---
    default_phone = format_phone(person.canonical_phone, prog["phone_format"])
    if rng.random() < p["phone_variation"]:
        style = pick_weighted(CONFIG["phone_style_weights"], rng)
        v["phone"] = format_phone(person.canonical_phone, style)
        v["_phone_varied"] = True
    else:
        v["phone"] = default_phone

    # --- EMAIL (variation folded into the formatting roll) ---
    email = person.canonical_email
    if fmt_roll:
        domain = weighted_choice(CONFIG["email_domains"], rng)
        email = vary_email_username(email.split("@")[0], rng) + "@" + domain
    v["email"] = apply_programme_email_case(email, prog_key, rng)

    # --- DATE OF BIRTH + GENDER + ADDRESS + STATUS (single formatting roll) ---
    if fmt_roll:
        v["_formatting"] = True
        v["dob"] = format_date(person.canonical_dob,
                               pick_weighted(CONFIG["date_style_weights"], rng))
        v["gender"] = rng.choice(ALL_GENDER_REPS)
        v["address"] = vary_address(person.canonical_address, rng)
        v["status"] = rng.choice(ALL_STATUS_REPS)
    else:
        v["dob"] = person.canonical_dob.isoformat()
        v["gender"] = prog["gender_values"][0 if person.canonical_gender == "Male" else 1]
        v["address"] = person.canonical_address
        v["status"] = rng.choice(prog["status_values"])

    # --- address change (person appears to have moved) — realism only, not a
    # formatting-category issue since it is a value change, not a formatting error ---
    if rng.random() < p["address_change"]:
        v["address"] = generate_address(rng)

    # --- GEOGRAPHY (formatting vs genuine error split) ---
    county, sub_county, ward = (person.canonical_county, person.canonical_sub_county,
                                person.canonical_ward)
    g = rng.random()
    if g < CONFIG["geography_genuine_error_percentage"]:
        other_county = rng.choice([c for c in KENYAN_GEOGRAPHY if c != county])
        other_sub = rng.choice(list(KENYAN_GEOGRAPHY[other_county].keys()))
        other_ward = rng.choice(KENYAN_GEOGRAPHY[other_county][other_sub])
        county, sub_county, ward = other_county, other_sub, other_ward
        v["_geo_genuine"] = True
    elif g < (CONFIG["geography_genuine_error_percentage"] +
              CONFIG["geography_formatting_percentage"]):
        fmt = rng.choice(["upper_county", "county_suffix", "space_subcounty", "upper_all",
                          "ward_extra_space", "subcounty_tight"])
        if fmt == "upper_county":
            county = county.upper()
        elif fmt == "county_suffix":
            county = county + " County"
        elif fmt == "space_subcounty":
            sub_county = sub_county.replace("/", " / ")
        elif fmt == "upper_all":
            county, sub_county, ward = county.upper(), sub_county.upper(), ward.upper()
        elif fmt == "ward_extra_space":
            ward = ward.replace("-", "  ")
        elif fmt == "subcounty_tight":
            sub_county = sub_county.replace(" ", "")
        v["_geo_format"] = True
    v["county"] = county
    v["sub_county"] = sub_county
    v["ward"] = ward

    # --- REGISTRATION DATE ---
    start = datetime.strptime(prog["date_start"], "%Y-%m-%d").date()
    end = datetime.strptime(prog["date_end"], "%Y-%m-%d").date()
    reg = start + timedelta(days=rng.randint(0, (end - start).days))
    v["reg_date"] = format_date(reg, pick_weighted(CONFIG["date_style_weights"], rng))

    # --- PROGRAMME-SPECIFIC FIELDS ---
    if prog_key == "SCH":
        v["school_name"] = person.sch_school
        v["education_level"] = person.sch_level
        if fmt_roll:
            v["education_level"] = rng.choice(EDUCATION_LEVELS).upper()
            v["_formatting"] = True
        v["course"] = person.sch_course
        v["scholarship_amount"] = person.sch_amount
        v["academic_year"] = person.sch_year
        if fmt_roll:
            v["academic_year"] = vary_academic_year(person.sch_year, rng)
            v["_formatting"] = True
    elif prog_key == "VOC":
        v["training_center"] = person.voc_center
        v["training_area"] = person.voc_area
        v["skill_category"] = person.voc_skill
        if fmt_roll:
            v["skill_category"] = rng.choice(SKILL_CATEGORIES).upper()
            v["_formatting"] = True
        v["training_status"] = person.voc_status
        v["completion_status"] = person.voc_completion
    elif prog_key == "PLUS":
        v["household_size"] = person.plus_household_size
        v["employment_status"] = person.plus_employment
        v["monthly_income"] = person.plus_income
        v["support_type"] = person.plus_support
        v["beneficiary_category"] = person.plus_category
    elif prog_key == "TECH":
        v["tech_track"] = person.tech_track
        v["cohort"] = person.tech_cohort
        if fmt_roll:
            v["cohort"] = vary_cohort(person.tech_cohort, rng)
            v["_formatting"] = True
        v["mentor"] = person.tech_mentor
        v["project_area"] = person.tech_project
        v["completion_status"] = person.tech_completion

    # --- MISSING VALUES (single roll; rarely touches the national ID) ---
    if rng.random() < p["missing"]:
        v["_missing"] = True
        fields = ["phone", "email", "dob", "address", "county", "sub_county", "ward",
                  "reg_date", "status"]
        if prog_key == "SCH":
            fields += ["school_name", "education_level"]
        elif prog_key == "VOC":
            fields += ["training_center"]
        elif prog_key == "PLUS":
            fields += ["household_size", "employment_status", "monthly_income"]
        elif prog_key == "TECH":
            fields += ["tech_track", "cohort"]
        n_missing = rng.randint(1, 3)
        for fld in rng.sample(fields, n_missing):
            v[fld] = rng.choice(prog["missing_representations"])
    if rng.random() < CONFIG["missing_id_percentage"]:
        v["id"] = rng.choice(prog["missing_representations"])
        v["_missing"] = True

    return v


def derive_flags(prog_key: str, person: CanonicalPerson, values: dict,
                 is_duplicate: bool = False) -> dict:
    """Derive dirty-data category flags for a public record."""
    prog = PROGRAMMES[prog_key]
    flags = {
        "missing": False,
        "formatting": False,
        "typo": False,
        "phone_variation": False,
        "name_variation": False,
        "id_variation": False,
        "geography_format": False,
        "geography_genuine": False,
        "duplicate": is_duplicate,
    }
    flags["missing"] = bool(values.get("_missing")) or any(
        is_missing_value(values.get(f)) for f in ("phone", "email", "dob", "address", "id"))
    flags["formatting"] = bool(values.get("_formatting"))
    flags["typo"] = bool(values.get("_typo"))
    flags["phone_variation"] = bool(values.get("_phone_varied"))
    flags["name_variation"] = bool(values.get("_name_varied"))
    flags["id_variation"] = bool(values.get("_id_varied"))
    flags["geography_format"] = bool(values.get("_geo_format"))
    flags["geography_genuine"] = bool(values.get("_geo_genuine"))
    return flags


# ====================================================================================
# DUPLICATE & FALSE-MATCH GENERATION
# ====================================================================================

def build_duplicate_values(prog_key: str, base: PublicRecord, dup_type: str,
                           rng: random.Random) -> dict:
    """Produce the public values for a duplicate record of `base`."""
    prog = PROGRAMMES[prog_key]
    v = dict(base.values)
    person = base.person

    if dup_type == "exact":
        pass
    elif dup_type == "formatting":
        style = rng.choice(["upper", "lower", "reversed", "comma", "initials", "extra_spaces"])
        v["name"] = apply_programme_name_case(
            vary_name(person.canonical_full_name, style, rng), prog_key, rng)
        v["_name_varied"] = True
        v["_formatting"] = True
        v["phone"] = format_phone(person.canonical_phone,
                                  rng.choice(list(CONFIG["phone_style_weights"].keys())))
        v["_phone_varied"] = True
        v["id"] = format_id(person.canonical_national_id,
                            rng.choice(list(CONFIG["id_style_weights"].keys())))
        v["_id_varied"] = True
    elif dup_type == "near":
        v["name"] = apply_programme_name_case(
            vary_name(person.canonical_full_name, "typo", rng), prog_key, rng)
        if normalize_name(v["name"]) == normalize_name(base.values["name"]):
            v["name"] = apply_programme_name_case(
                vary_name(person.canonical_full_name,
                          rng.choice(["reversed", "comma", "initials"]), rng),
                prog_key, rng)
        v["_typo"] = True
        v["_name_varied"] = True
        v["_formatting"] = True
        email = base.values.get("email")
        if email and "@" in email and not is_missing_value(email):
            v["email"] = vary_email_username(email.split("@")[0], rng) + "@" + email.split("@")[-1]
        v["phone"] = format_phone(person.canonical_phone,
                                  rng.choice(list(CONFIG["phone_style_weights"].keys())))
        v["_phone_varied"] = True
        v["id"] = format_id(person.canonical_national_id,
                            rng.choice(list(CONFIG["id_style_weights"].keys())))
        v["_id_varied"] = True
    elif dup_type == "updated":
        # person updated their phone/email/address while keeping the same ID
        new_phone = person.canonical_phone
        if rng.random() < 0.8:
            new_phone = new_phone[:3] + f"{rng.randint(100000, 999999):06d}"
        v["phone"] = format_phone(new_phone, prog["phone_format"])
        v["_phone_varied"] = True
        email = base.values.get("email")
        if email and "@" in email and not is_missing_value(email):
            v["email"] = vary_email_username(email.split("@")[0], rng) + "@" + email.split("@")[-1]
        v["address"] = generate_address(rng)
        v["_formatting"] = True

    return v


def generate_duplicates(base_records: List[PublicRecord], prog_key: str, count: int,
                        rng: random.Random, start_idx: Optional[int] = None
                        ) -> Tuple[List[PublicRecord], List[dict]]:
    """Create `count` duplicate records from the base records. Returns (dups, dup_truth)."""
    prog = PROGRAMMES[prog_key]
    prefix = prog["beneficiary_prefix"]
    dups: List[PublicRecord] = []
    dup_truth: List[dict] = []
    next_idx = start_idx if start_idx is not None else len(base_records) + 1

    dup_type_pool = [t for t in ("exact", "formatting", "near", "updated")]
    dup_type_weights = {"exact": 0.20, "formatting": 0.30, "near": 0.35, "updated": 0.15}

    for _ in range(count):
        base = rng.choice(base_records)
        dup_type = weighted_choice(list(dup_type_weights.items()), rng)
        new_rec = PublicRecord(
            programme=prog_key,
            beneficiary_id=f"{prefix}-{next_idx:06d}",
            person=base.person,
            is_duplicate=True,
            duplicate_type=dup_type,
            dup_group_id=base.beneficiary_id,
        )
        new_rec.values = build_duplicate_values(prog_key, base, dup_type, rng)
        new_rec.flags = derive_flags(prog_key, base.person, new_rec.values,
                                     is_duplicate=True)
        dups.append(new_rec)
        dup_truth.append({
            "programme": prog_key,
            "record_id_1": base.beneficiary_id,
            "record_id_2": new_rec.beneficiary_id,
            "canonical_person_id": base.person.canonical_person_id,
            "canonical_national_id": base.person.canonical_national_id,
            "duplicate_type": dup_type,
        })
        next_idx += 1

    return dups, dup_truth


def create_false_match_person(base: CanonicalPerson, next_person_id: int,
                              used_ids: set, rng: random.Random) -> CanonicalPerson:
    """Create a distinct canonical person that looks like `base` but has a different ID."""
    nid = str(rng.randint(10000000, 99999999))
    while nid in used_ids:
        nid = str(rng.randint(10000000, 99999999))

    first = base.canonical_full_name.split()[0]
    last = base.canonical_full_name.split()[-1]
    middle = rng.choice(FIRST_NAMES)
    full_name = f"{first} {middle} {last}"

    pfx = base.canonical_phone[:3]
    phone = pfx + f"{rng.randint(100000, 999999):06d}"

    domain = weighted_choice(CONFIG["email_domains"], rng)
    email = f"{first.lower()}.{last.lower()}@{domain}"

    return CanonicalPerson(
        canonical_person_id=next_person_id,
        canonical_full_name=full_name,
        canonical_national_id=nid,
        canonical_phone=phone,
        canonical_email=email,
        canonical_dob=base.canonical_dob,
        canonical_gender=base.canonical_gender,
        canonical_county=base.canonical_county,
        canonical_sub_county=base.canonical_sub_county,
        canonical_ward=base.canonical_ward,
        canonical_address=generate_address(rng),
        sch_school=base.sch_school, sch_level=base.sch_level, sch_course=base.sch_course,
        sch_amount=base.sch_amount, sch_year=base.sch_year,
        voc_center=base.voc_center, voc_area=base.voc_area, voc_skill=base.voc_skill,
        voc_status=base.voc_status, voc_completion=base.voc_completion,
        plus_household_size=base.plus_household_size, plus_employment=base.plus_employment,
        plus_income=base.plus_income, plus_support=base.plus_support, plus_category=base.plus_category,
        tech_track=base.tech_track, tech_cohort=base.tech_cohort, tech_mentor=base.tech_mentor,
        tech_project=base.tech_project, tech_completion=base.tech_completion,
    )


def generate_false_matches(base_records: List[PublicRecord], prog_key: str, count: int,
                           next_person_id: int, used_ids: set, start_idx: int,
                           rng: random.Random) -> Tuple[List[PublicRecord], List[CanonicalPerson]]:
    """Add `count` false-match records: genuinely different people who share
    name/phone/email similarities with existing beneficiaries."""
    prog = PROGRAMMES[prog_key]
    prefix = prog["beneficiary_prefix"]
    cols = prog["columns"]
    new_records: List[PublicRecord] = []
    new_people: List[CanonicalPerson] = []
    next_idx = start_idx
    pid_counter = next_person_id

    for base in rng.sample(base_records, min(count, len(base_records))):
        new_person = create_false_match_person(base.person, pid_counter, used_ids, rng)
        used_ids.add(new_person.canonical_national_id)
        new_people.append(new_person)
        pid_counter += 1

        rec = PublicRecord(programme=prog_key,
                           beneficiary_id=f"{prefix}-{next_idx:06d}",
                           person=new_person)
        rec.values = build_public_values(prog_key, new_person, rng)

        # force similarity with the base beneficiary in a controlled way
        # (a false match is a DIFFERENT person, so these similarities are NOT
        #  counted as name/phone/email "variations" of the same canonical person)
        choice = rng.random()
        if choice < 0.70:
            rec.values["name"] = apply_programme_name_case(
                f"{new_person.canonical_full_name.split()[0]} "
                f"{base.person.canonical_full_name.split()[-1]}",
                prog_key, rng)
        if 0.30 <= choice < 0.60:
            base_phone = base.person.canonical_phone
            new_phone = rec.values["phone"]
            digits = digits_only(new_phone)
            if len(digits) >= 10:
                digits = digits[:6] + base_phone[-4:]
            rec.values["phone"] = format_phone("07" + digits[2:], prog["phone_format"]) \
                if len(digits) == 10 else new_phone
        if 0.50 <= choice < 0.80:
            base_local = base.person.canonical_email.split("@")[0]
            dom = "gmail.com" if rng.random() < 0.5 else "yahoo.com"
            rec.values["email"] = f"{base_local}@{dom}"
        rec.flags = derive_flags(prog_key, new_person, rec.values)

        new_records.append(rec)
        next_idx += 1

    return new_records, new_people


# ====================================================================================
# DATAFRAME / OUTPUT HELPERS
# ====================================================================================

def records_to_dataframe(records: List[PublicRecord], prog_key: str) -> pd.DataFrame:
    """Convert public records for a programme into a pandas DataFrame with the
    programme-specific column names."""
    prog = PROGRAMMES[prog_key]
    cols = prog["columns"]

    rows = []
    for rec in records:
        row = {
            cols["beneficiary_id"]: rec.beneficiary_id,
            cols["name"]: rec.values["name"],
            cols["id"]: rec.values["id"],
            cols["phone"]: rec.values["phone"],
            cols["email"]: rec.values["email"],
            cols["dob"]: rec.values["dob"],
            cols["gender"]: rec.values["gender"],
            cols["county"]: rec.values["county"],
            cols["sub_county"]: rec.values["sub_county"],
            cols["ward"]: rec.values["ward"],
            cols["address"]: rec.values["address"],
            cols["reg_date"]: rec.values["reg_date"],
            cols["status"]: rec.values["status"],
        }
        for fname, _ftype in PROGRAMME_FIELDS[prog_key]:
            row[fname] = rec.values.get(fname, "")
        rows.append(row)
    return pd.DataFrame(rows)


# ====================================================================================
# VALIDATION
# ====================================================================================

def validate_datasets(dfs: Dict[str, pd.DataFrame],
                      programme_records: Dict[str, List[PublicRecord]]) -> ValidationResult:
    """Run all automated validation checks."""
    errors: List[str] = []
    stats_rows: List[dict] = []

    for prog_key, df in dfs.items():
        n = len(df)
        if n != CONFIG["rows_per_programme"]:
            errors.append(f"{prog_key}: ROW COUNT {n} != {CONFIG['rows_per_programme']}")

        prog = PROGRAMMES[prog_key]
        expected = list(prog["columns"].values()) + [f for f, _ in PROGRAMME_FIELDS[prog_key]]
        missing_cols = [c for c in expected if c not in df.columns]
        if missing_cols:
            errors.append(f"{prog_key}: missing columns {missing_cols}")

        leaked = [c for c in df.columns if "canonical" in c.lower()]
        if leaked:
            errors.append(f"{prog_key}: LEAKED ground-truth columns {leaked}")

        records = programme_records[prog_key]
        if len(records) != n:
            errors.append(f"{prog_key}: record list length {len(records)} != {n}")

        # aggregate flags
        agg = {
            "missing": sum(r.flags["missing"] for r in records),
            "formatting": sum(r.flags["formatting"] for r in records),
            "typo": sum(r.flags["typo"] for r in records),
            "duplicate": sum(r.flags["duplicate"] for r in records),
            "phone_variation": sum(r.flags["phone_variation"] for r in records),
            "name_variation": sum(r.flags["name_variation"] for r in records),
            "id_variation": sum(r.flags["id_variation"] for r in records),
            "geography": sum(r.flags["geography_format"] or r.flags["geography_genuine"]
                             for r in records),
        }
        pct = {k: (c / n) for k, c in agg.items()}

        # duplicate range
        if not (CONFIG["duplicate_min_percentage"] <= pct["duplicate"] <=
                CONFIG["duplicate_max_percentage"]):
            errors.append(f"{prog_key}: duplicate % = {pct['duplicate']:.3f} outside "
                          f"[{CONFIG['duplicate_min_percentage']}, {CONFIG['duplicate_max_percentage']}]")

        # dirty category range
        for cat in ("missing", "formatting", "typo", "phone_variation",
                    "name_variation", "id_variation"):
            if not (CONFIG["min_dirty_percentage"] <= pct[cat] <=
                    CONFIG["max_dirty_percentage"]):
                errors.append(f"{prog_key}: {cat} % = {pct[cat]:.3f} outside "
                              f"[{CONFIG['min_dirty_percentage']}, {CONFIG['max_dirty_percentage']}]")

        # geography combined range
        if not (CONFIG["geography_min_percentage"] <= pct["geography"] <=
                CONFIG["geography_max_percentage"]):
            errors.append(f"{prog_key}: geography % = {pct['geography']:.3f} outside "
                          f"[{CONFIG['geography_min_percentage']}, {CONFIG['geography_max_percentage']}]")

        stats_rows.append({
            "programme": prog["name"],
            "programme_key": prog_key,
            "rows": n,
            "null_percentage": round(pct["missing"] * 100, 2),
            "formatting_percentage": round(pct["formatting"] * 100, 2),
            "typo_percentage": round(pct["typo"] * 100, 2),
            "duplicate_percentage": round(pct["duplicate"] * 100, 2),
            "phone_variation_percentage": round(pct["phone_variation"] * 100, 2),
            "name_variation_percentage": round(pct["name_variation"] * 100, 2),
            "id_variation_percentage": round(pct["id_variation"] * 100, 2),
            "geography_formatting_percentage": round(
                sum(r.flags["geography_format"] for r in records) / n * 100, 2),
            "geography_genuine_percentage": round(
                sum(r.flags["geography_genuine"] for r in records) / n * 100, 2),
            "geography_total_percentage": round(pct["geography"] * 100, 2),
        })

    stats = pd.DataFrame(stats_rows)
    summary = stats[["programme", "rows", "null_percentage", "formatting_percentage",
                     "typo_percentage", "duplicate_percentage"]].copy()
    summary.columns = ["programme", "rows", "null_records_pct", "formatting_pct",
                       "typo_pct", "duplicates_pct"]

    return ValidationResult(passed=len(errors) == 0, errors=errors,
                            stats=stats, summary=summary)


# ====================================================================================
# GROUND TRUTH BUILDERS
# ====================================================================================

def build_ground_truth(people: List[CanonicalPerson],
                       programme_records: Dict[str, List[PublicRecord]],
                       assignment: Dict[int, List[str]],
                       dup_truth: List[dict]) -> Dict[str, pd.DataFrame]:
    """Build all organiser-only ground-truth dataframes."""
    # canonical master people
    gt_canonical = pd.DataFrame([
        {
            "canonical_person_id": p.canonical_person_id,
            "canonical_full_name": p.canonical_full_name,
            "canonical_national_id": p.canonical_national_id,
            "canonical_phone": p.canonical_phone,
            "canonical_email": p.canonical_email,
            "canonical_dob": p.canonical_dob.isoformat(),
            "canonical_gender": p.canonical_gender,
            "canonical_county": p.canonical_county,
            "canonical_sub_county": p.canonical_sub_county,
            "canonical_ward": p.canonical_ward,
            "canonical_address": p.canonical_address,
        } for p in people
    ])

    # record -> canonical person mapping (built directly from the record objects)
    mapping_rows = []
    for prog_key, records in programme_records.items():
        for rec in records:
            mapping_rows.append({
                "programme": prog_key,
                "beneficiary_id": rec.beneficiary_id,
                "canonical_person_id": rec.person.canonical_person_id,
                "canonical_national_id": rec.person.canonical_national_id,
            })
    gt_mapping = pd.DataFrame(mapping_rows)

    # cross-programme entity truth
    cp_rows = []
    for pid, progs in sorted(assignment.items()):
        if not progs:
            continue
        person = next((p for p in people if p.canonical_person_id == pid), None)
        cp_rows.append({
            "canonical_person_id": pid,
            "canonical_national_id": person.canonical_national_id if person else "",
            "programme_count": len(progs),
            "programmes": "|".join(sorted(progs)),
        })
    gt_cross = pd.DataFrame(cp_rows)

    gt_dup = pd.DataFrame(dup_truth)

    return {
        "canonical_master_people": gt_canonical,
        "ground_truth_record_mapping": gt_mapping,
        "cross_programme_entity_truth": gt_cross,
        "duplicate_truth": gt_dup,
    }


# ====================================================================================
# SAVE / PACKAGING
# ====================================================================================

def save_all(dfs: Dict[str, pd.DataFrame], ground_truth: Dict[str, pd.DataFrame],
             validation: Dict[str, pd.DataFrame], output_dir: str) -> None:
    """Write all files and create the ZIP archive."""
    base = Path(output_dir) / "hackathon2_dirty_datasets"
    base.mkdir(parents=True, exist_ok=True)

    public_dir = base / "public"
    gt_dir = base / "ground_truth"
    val_dir = base / "validation"
    public_dir.mkdir(parents=True, exist_ok=True)
    gt_dir.mkdir(parents=True, exist_ok=True)
    val_dir.mkdir(parents=True, exist_ok=True)

    for key, df in dfs.items():
        df.to_csv(public_dir / PROGRAMMES[key]["filename"], index=False)

    for name, df in ground_truth.items():
        df.to_csv(gt_dir / f"{name}.csv", index=False)

    for name, df in validation.items():
        df.to_csv(val_dir / f"{name}.csv", index=False)

    write_readme_public(base)
    write_readme_organizer(base)

    zip_path = Path(output_dir) / "hackathon2_dirty_datasets.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(base.rglob("*")):
            if f.is_file():
                zf.write(f, f.relative_to(Path(output_dir)))


def write_readme_public(base: Path) -> None:
    content = """# Hackathon 2 — Dirty Multi-Programme Datasets

## Challenge Overview

Four beneficiary datasets from **four independently maintained programme registration systems** are provided. The programmes are:

| Programme | File | Rows |
|---|---|---|
| Inuka Scholarship Program | `inuka_scholarship_program.csv` | 1,500 |
| Inuka Vocational Youth Empowerment Programme | `inuka_vocational_youth_empowerment_programme.csv` | 1,500 |
| Inuka Plus | `inuka_plus.csv` | 1,500 |
| Inuka Tech Fellowship | `inuka_tech_fellowship.csv` | 1,500 |

**Total: 6,000 public records.**

## Goal

Because these systems were operated independently, the same beneficiary may appear in more than one programme, and the information recorded about them may differ between systems. Your task is to:

1. Profile and assess the quality of each dataset.
2. Clean, standardise and normalise the data.
3. Identify duplicate registrations **within** each programme.
4. Identify the **same beneficiary across programmes** (entity resolution).
5. Build an integrated, de-duplicated view of the beneficiary population.

## Common Fields

Each dataset contains a beneficiary identification structure:

- `beneficiary_id` — record identifier *within* that programme
- `full_name` (or equivalent)
- national ID number (column name varies by programme)
- phone / mobile / telephone
- email
- date of birth
- gender
- county, sub-county, ward
- address
- registration / enrollment date
- status

**Note:** column names differ slightly between programmes because each system was built separately.

## Programme-Specific Fields

| Programme | Extra fields |
|---|---|
| Scholarship | school_name, education_level, course, scholarship_amount, academic_year |
| Vocational | training_center, training_area, skill_category, training_status, completion_status |
| Inuka Plus | household_size, employment_status, monthly_income, support_type, beneficiary_category |
| Tech Fellowship | tech_track, cohort, mentor, project_area, completion_status |

## Data Quality Expectations

Real registration data is messy. Expect:

- Missing or null values (represented in several ways)
- Inconsistent formatting (names, dates, phone numbers, IDs, addresses)
- Typos and transcription mistakes
- Duplicate / near-duplicate registrations
- Different values for the same person across programmes
- Occasionally conflicting location information

Attributes differ in reliability. When identifying and consolidating the same beneficiary across programmes, **investigate which attributes provide the strongest, most stable linkage** — some attributes are more trustworthy than others.

## Notes

- The four files use CSV format and can be loaded directly with `pandas.read_csv`.
- Rows are in arbitrary order.
- This challenge mirrors a real-world data-integration problem: no single dataset is "the master" — you must reconcile them.

Good luck!
"""
    (base / "README_PUBLIC.md").write_text(content, encoding="utf-8")


def write_readme_organizer(base: Path) -> None:
    content = """# Hackathon 2 — Organiser README (Ground Truth)

This folder contains **organiser-only** ground-truth files. Do **not** distribute them to participants.

## Ground-Truth Files

| File | Description |
|---|---|
| `canonical_master_people.csv` | Clean canonical identity for every synthetic person |
| `ground_truth_record_mapping.csv` | Maps every public record to its canonical person |
| `cross_programme_entity_truth.csv` | Which canonical people appear in multiple programmes |
| `duplicate_truth.csv` | Duplicate / near-duplicate relationships |

## Design Summary

- **Canonical population:** ~3,000 synthetic people created first; every public record derives from exactly one canonical person.
- **National ID is the authoritative identity key.** It is stable for each canonical person. The public datasets apply deliberate *formatting* variations (spaces, dashes, leading/trailing spaces) and only a small, controlled number of genuine transcription errors (~2%). Other attributes (name, phone, email, address) are intentionally allowed to drift between programmes and across duplicate registrations.
- **Cross-programme overlap** is controlled via the assignment step: people appear in 1–4 programmes. `cross_programme_entity_truth.csv` records the membership sets.
- **Duplicates** target 15–25% of rows per programme, as a mix of exact, formatting, near and updated-record duplicates.
- **False matches** (~5% of rows) are genuinely different people crafted to share a name, phone digits or email username with an existing beneficiary — they must NOT be merged. Their canonical IDs differ.
- **Dirty categories** target 15–25% per programme and intentionally overlap (a single record can have multiple issues). Geography issues are split ~10–11% formatting and ~5% genuine wrong-combination errors.

## Validation Methodology

The generator performs automated validation on every run:

- Row count == 1,500 per programme (hard requirement)
- Required columns present
- Duplicate % within [15%, 25%]
- Each dirty category within the configured range
- Geography % within its range
- No ground-truth columns (e.g. `canonical_person_id`) leaked into public CSVs
- Record-list length consistent with the exported DataFrames

If any check fails the generator regenerates (up to `max_generation_attempts`). Only fully-validated datasets are written to disk.

## Reproducibility

`python generate_datasets.py --seed 42` always reproduces the exact same datasets. Change `--seed` to produce reproducible variants. All randomness is seeded at the start of the run.

## Ground-Truth Schemas

### canonical_master_people.csv
`canonical_person_id, canonical_full_name, canonical_national_id, canonical_phone, canonical_email, canonical_dob, canonical_gender, canonical_county, canonical_sub_county, canonical_ward, canonical_address`

### ground_truth_record_mapping.csv
`programme, beneficiary_id, canonical_person_id, canonical_national_id`

### cross_programme_entity_truth.csv
`canonical_person_id, canonical_national_id, programme_count, programmes`

### duplicate_truth.csv
`programme, record_id_1, record_id_2, canonical_person_id, canonical_national_id, duplicate_type`
"""
    (base / "README_ORGANIZER.md").write_text(content, encoding="utf-8")


# ====================================================================================
# MAIN GENERATION PIPELINE
# ====================================================================================

def generate_all(seed: int):
    """Run the full pipeline once. Returns everything needed for validation & saving."""
    rng = random.Random(seed)
    random.seed(seed)
    np.random.seed(seed)

    rows = CONFIG["rows_per_programme"]
    false_target = int(rows * CONFIG["false_match_ratio"])          # ~75
    dup_target = int(rows * CONFIG["duplicate_target_ratio"])       # ~300
    base_target = rows - dup_target - false_target                  # ~1125

    people = generate_canonical_people(CONFIG["target_canonical_people"], rng)
    assignment = assign_programmes(people, base_target, rng)

    dfs: Dict[str, pd.DataFrame] = {}
    programme_records: Dict[str, List[PublicRecord]] = {}
    dup_truth: List[dict] = []
    used_ids = {p.canonical_national_id for p in people}
    next_person_id = len(people) + 1
    all_people = list(people)

    for prog_key in PROGRAMMES:
        # 1) base records from assigned members
        members = [p for p in people if prog_key in assignment.get(p.canonical_person_id, [])]
        # if balancing left us short (edge case), top up from unassigned people
        rng.shuffle(members)
        while len(members) < base_target:
            spare = [p for p in people if prog_key not in assignment.get(p.canonical_person_id, [])]
            if not spare:
                break
            p = rng.choice(spare)
            assignment[p.canonical_person_id] = assignment.get(p.canonical_person_id, []) + [prog_key]
            members.append(p)
        members = members[:base_target]

        prefix = PROGRAMMES[prog_key]["beneficiary_prefix"]
        base_records: List[PublicRecord] = []
        for idx, person in enumerate(members, start=1):
            rec = PublicRecord(programme=prog_key,
                               beneficiary_id=f"{prefix}-{idx:06d}",
                               person=person)
            rec.values = build_public_values(prog_key, person, rng)
            rec.flags = derive_flags(prog_key, person, rec.values)
            base_records.append(rec)

        # 2) duplicates
        dups, dt = generate_duplicates(base_records, prog_key, dup_target, rng)
        dup_truth.extend(dt)

        # 3) false matches (genuinely different people, similar to a beneficiary)
        false_start = len(base_records) + len(dups) + 1
        false_recs, false_people = generate_false_matches(
            base_records, prog_key, false_target, next_person_id, used_ids,
            false_start, rng)
        next_person_id += len(false_people)
        all_people.extend(false_people)
        for p in false_people:
            assignment[p.canonical_person_id] = [prog_key]

        records = base_records + dups + false_recs
        # exact row budget guarantee
        if len(records) > rows:
            records = records[:rows]
        elif len(records) < rows:
            # pad with formatting duplicates of existing records
            n_pad = rows - len(records)
            pad_recs, pad_truth = generate_duplicates(
                base_records, prog_key, n_pad, rng, start_idx=len(records) + 1)
            records = records + pad_recs
            dup_truth.extend(pad_truth)

        programme_records[prog_key] = records
        dfs[prog_key] = records_to_dataframe(records, prog_key)

    ground_truth = build_ground_truth(all_people, programme_records, assignment, dup_truth)
    return dfs, ground_truth, programme_records, all_people, assignment, dup_truth


# ====================================================================================
# STATISTICS & REPORT
# ====================================================================================

def compute_cross_summary(all_people: List[CanonicalPerson],
                          assignment: Dict[int, List[str]]) -> dict:
    counts = [len(progs) for pid, progs in assignment.items() if progs]
    return {
        "total_public_records": CONFIG["rows_per_programme"] * len(PROGRAMMES),
        "canonical_people_in_public_data": len(counts),
        "people_1_programme": int(sum(1 for c in counts if c == 1)),
        "people_2_programmes": int(sum(1 for c in counts if c == 2)),
        "people_3_programmes": int(sum(1 for c in counts if c == 3)),
        "people_4_programmes": int(sum(1 for c in counts if c == 4)),
    }


def print_final_report(stats_df: pd.DataFrame, cross: dict, output_dir: str) -> None:
    print()
    print("=" * 60)
    print("HACKATHON 2 DATASET GENERATION VALIDATION")
    print("=" * 60)
    for _, row in stats_df.iterrows():
        print(f"\n{row['programme']}")
        print(f"Rows: {int(row['rows'])}")
        print(f"Null records: {row['null_percentage']}%")
        print(f"Formatting issues: {row['formatting_percentage']}%")
        print(f"Typos: {row['typo_percentage']}%")
        print(f"Duplicate/near-duplicates: {row['duplicate_percentage']}%")
        print(f"Phone variation: {row['phone_variation_percentage']}%")
        print(f"Name variation: {row['name_variation_percentage']}%")
        print(f"ID variation: {row['id_variation_percentage']}%")
        print(f"Geography formatting: {row['geography_formatting_percentage']}%")
        print(f"Geography genuine errors: {row['geography_genuine_percentage']}%")
    print()
    print("=" * 60)
    print(f"TOTAL PUBLIC RECORDS: {cross['total_public_records']}")
    print("=" * 60)
    print()
    print(f"Canonical people in public data: {cross['canonical_people_in_public_data']}")
    print(f"People appearing in 1 programme: {cross['people_1_programme']}")
    print(f"People appearing in 2 programmes: {cross['people_2_programmes']}")
    print(f"People appearing in 3 programmes: {cross['people_3_programmes']}")
    print(f"People appearing in 4 programmes: {cross['people_4_programmes']}")
    print()
    print(f"Datasets written to: {Path(output_dir) / 'hackathon2_dirty_datasets'}")
    print(f"ZIP archive: {Path(output_dir) / 'hackathon2_dirty_datasets.zip'}")
    print()
    print("Validation: PASSED")
    print("=" * 60)


# ====================================================================================
# ENTRY POINT
# ====================================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Hackathon 2 — Dirty Multi-Programme Dataset Generator")
    parser.add_argument("--seed", type=int, default=CONFIG["random_seed"],
                        help="Random seed (default 42). Same seed => same datasets.")
    parser.add_argument("--output", type=str, default="./output",
                        help="Output directory (default ./output)")
    args = parser.parse_args()

    CONFIG["random_seed"] = args.seed

    output_path = Path(args.output)
    output_path.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("HACKATHON 2 DATASET GENERATION")
    print(f"Seed: {args.seed} | Output: {args.output}")
    print("=" * 60)

    last_stats = None
    for attempt in range(1, CONFIG["max_generation_attempts"] + 1):
        # Derive a fresh seed per attempt so a failed attempt regenerates NEW data.
        attempt_seed = args.seed + attempt - 1
        print(f"\nGeneration attempt {attempt}/{CONFIG['max_generation_attempts']} "
              f"(seed {attempt_seed})...")
        dfs, ground_truth, programme_records, all_people, assignment, dup_truth = \
            generate_all(attempt_seed)

        result = validate_datasets(dfs, programme_records)
        if result.passed:
            print("Validation PASSED.")
            last_stats = result.stats
            break

        print(f"Validation failed ({len(result.errors)} issue(s)):")
        for e in result.errors:
            print(f"  - {e}")
        if attempt == CONFIG["max_generation_attempts"]:
            print("\nDATASET GENERATION FAILED: could not satisfy all validation checks "
                  "within the maximum number of attempts.")
            print("No files were published.")
            raise SystemExit(1)
    else:
        print("\nDATASET GENERATION FAILED: no valid dataset produced.")
        raise SystemExit(1)

    cross = compute_cross_summary(all_people, assignment)

    validation_out = {
        "validation_summary": result.summary,
        "dirty_data_statistics": last_stats,
    }

    save_all(dfs, ground_truth, validation_out, args.output)

    print_final_report(last_stats, cross, args.output)


if __name__ == "__main__":
    main()