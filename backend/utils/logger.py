import logging
import os
import sys
from datetime import datetime
from pathlib import Path

def get_logger(name='AppLogger', level=logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.hasHandlers():
        log_dir = Path(__file__).resolve().parent.parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)

        log_filename = name.lower().replace(' ', '_').replace('-', '_') + '.log'
        log_file = log_dir / log_filename

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_formatter = logging.Formatter('[%(asctime)s] - [%(levelname)s] - %(name)s - %(message)s')
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_formatter = logging.Formatter('[%(asctime)s] - [%(levelname)s] - %(name)s - %(message)s', 
                                            datefmt='%Y-%m-%d %H:%M:%S')
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

        logger.propagate = False

    return logger
