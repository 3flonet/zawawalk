<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrationForm;

class FormController extends Controller
{
    private function checkAdmin()
    {
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Hanya Admin yang memiliki akses untuk tindakan ini.');
        }
    }

    public function store(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'title' => 'required|string|max:255',
            'ticket_price' => 'required|numeric|min:0',
            'fields_schema' => 'required|array',
            'fields_schema.*.name' => 'required|string|max:50',
            'fields_schema.*.label' => 'required|string|max:100',
            'fields_schema.*.type' => 'required|in:text,number,email,select,signature,textarea,image,date,datetime,multiselect,title,description,phone,url,rating,checkbox',
            'fields_schema.*.required' => 'required|boolean',
            'fields_schema.*.options' => 'nullable|array',
            'fields_schema.*.allow_other' => 'nullable|boolean',
            'fields_schema.*.placeholder' => 'nullable|string|max:255',
            'fields_schema.*.help_text' => 'nullable|string|max:255',
            'fields_schema.*.description' => 'nullable|string|max:500',
            'max_participants' => 'nullable|integer|min:1',
            'closed_at' => 'nullable|date',
            'additional_fees' => 'nullable|array',
        ]);

        // If newly created form is set to active (or default), deactivate other forms
        RegistrationForm::where('is_active', true)->update(['is_active' => false]);

        RegistrationForm::create([
            'title' => $request->input('title'),
            'ticket_price' => $request->input('ticket_price'),
            'fields_schema' => $request->input('fields_schema'),
            'is_active' => true,
            'max_participants' => $request->input('max_participants') ?: null,
            'closed_at' => $request->input('closed_at') ?: null,
            'additional_fees' => $request->input('additional_fees'),
        ]);

        return redirect()->back()->with('success', 'Form created successfully.');
    }

    public function update(Request $request, $id)
    {
        $this->checkAdmin();
        $request->validate([
            'title' => 'required|string|max:255',
            'ticket_price' => 'required|numeric|min:0',
            'fields_schema' => 'required|array',
            'fields_schema.*.name' => 'required|string|max:50',
            'fields_schema.*.label' => 'required|string|max:100',
            'fields_schema.*.type' => 'required|in:text,number,email,select,signature,textarea,image,date,datetime,multiselect,title,description,phone,url,rating,checkbox',
            'fields_schema.*.required' => 'required|boolean',
            'fields_schema.*.options' => 'nullable|array',
            'fields_schema.*.allow_other' => 'nullable|boolean',
            'fields_schema.*.placeholder' => 'nullable|string|max:255',
            'fields_schema.*.help_text' => 'nullable|string|max:255',
            'fields_schema.*.description' => 'nullable|string|max:500',
            'max_participants' => 'nullable|integer|min:1',
            'closed_at' => 'nullable|date',
            'additional_fees' => 'nullable|array',
        ]);

        $form = RegistrationForm::findOrFail($id);
        $form->update([
            'title' => $request->input('title'),
            'ticket_price' => $request->input('ticket_price'),
            'fields_schema' => $request->input('fields_schema'),
            'max_participants' => $request->input('max_participants') ?: null,
            'closed_at' => $request->input('closed_at') ?: null,
            'additional_fees' => $request->input('additional_fees'),
        ]);

        return redirect()->back()->with('success', 'Form updated successfully.');
    }

    public function toggleActive($id)
    {
        $this->checkAdmin();
        $form = RegistrationForm::findOrFail($id);
        
        if (!$form->is_active) {
            // Deactivate all others
            RegistrationForm::where('is_active', true)->update(['is_active' => false]);
            $form->is_active = true;
        } else {
            $form->is_active = false;
        }
        
        $form->save();

        return redirect()->back()->with('success', 'Form status toggled successfully.');
    }

    public function destroy($id)
    {
        $this->checkAdmin();
        $form = RegistrationForm::findOrFail($id);
        $form->delete();

        return redirect()->back()->with('success', 'Form deleted successfully.');
    }
}
