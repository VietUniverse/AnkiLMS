from django.http import HttpResponse

def home(request):
    return HttpResponse("<h1>AnkiLMS Backend is Running!</h1>")