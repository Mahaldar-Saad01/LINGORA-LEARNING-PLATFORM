from django.db import transaction
from django.db.models import Max

from academics.models import LearningPath, LearningPathItem


def reorder_path_items(path, ordered_items=None):
    """Lock and renumber a path's items contiguously without unique collisions."""
    with transaction.atomic():
        locked_path = LearningPath.objects.select_for_update().get(pk=path.pk)
        locked_items = list(
            LearningPathItem.objects.select_for_update()
            .filter(path=locked_path)
            .order_by('order_no', 'id')
        )
        by_id = {item.pk: item for item in locked_items}
        if ordered_items is None:
            final_items = locked_items
        else:
            ordered_ids = [item.pk for item in ordered_items]
            if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != set(by_id):
                raise ValueError('The requested order must contain every path item exactly once.')
            final_items = [by_id[item_id] for item_id in ordered_ids]

        if not final_items:
            return locked_path

        maximum = (
            LearningPathItem.objects.filter(path=locked_path)
            .aggregate(maximum=Max('order_no'))['maximum']
            or 0
        )
        temporary_offset = maximum + len(final_items) + 1
        for index, item in enumerate(final_items, start=1):
            item.order_no = temporary_offset + index
        LearningPathItem.objects.bulk_update(final_items, ['order_no'])

        for index, item in enumerate(final_items, start=1):
            item.order_no = index
        LearningPathItem.objects.bulk_update(final_items, ['order_no'])
        return locked_path
