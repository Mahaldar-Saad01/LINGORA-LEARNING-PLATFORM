import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test.runner import DiscoverRunner

runner = DiscoverRunner(verbosity=2)
failures = runner.run_tests(['notifications'])
sys.exit(bool(failures))
