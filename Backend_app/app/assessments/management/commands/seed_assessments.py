from django.core.management.base import BaseCommand

from assessments.management.seedingdata.assessment_seeder import AssessmentSeeder


class Command(BaseCommand):
    help = 'Idempotently seed assessment questions, passages, and options from JSON.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            dest='data_file',
            help='Optional path to another assessment seed JSON file.',
        )

    def handle(self, *args, **options):
        counts = AssessmentSeeder(options.get('data_file')).run()
        summary = ', '.join(f'{name}={count}' for name, count in counts.items())
        self.stdout.write(self.style.SUCCESS(f'Assessment seed completed: {summary}'))
