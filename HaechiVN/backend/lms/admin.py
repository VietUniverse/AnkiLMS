from django.contrib import admin
from .models import Classroom, Deck, Progress

@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ('name', 'teacher', 'created_at')
    filter_horizontal = ('students',) # Giúp chọn học sinh dễ hơn

admin.site.register(Deck)
admin.site.register(Progress)